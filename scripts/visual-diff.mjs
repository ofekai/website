#!/usr/bin/env node
/**
 * Visual-diff harness: screenshots the built site (dist/) against
 * _legacy/index.html at a fixed set of widths, plus the cross-cutting
 * checks every phase gate calls for (horizontal overflow, console
 * errors/404s). Reused across phases rather than rewritten each time.
 *
 * Usage: npm run build && node scripts/visual-diff.mjs
 * Screenshots land in .visual-diff/ (gitignored).
 *
 * Both sites' [data-reveal]/[data-aos] elements are forced to their
 * settled "revealed" state before capture — a fullPage screenshot never
 * scrolls anything into view for real, so whichever IntersectionObserver
 * each site uses never fires otherwise, leaving below-the-fold sections
 * stuck at opacity:0.
 *
 * _legacy/ only kept index.html/css/js (images live in public/ now), so
 * the legacy server falls back to public/images/ for any /images/* path
 * it doesn't have itself.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const LEGACY_DIR = path.join(PROJECT_ROOT, '_legacy');
const PUBLIC_IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images');
const OUT_DIR = path.join(PROJECT_ROOT, '.visual-diff');

const WIDTHS = [1440, 1200, 1100, 1000, 900, 868, 768, 425];

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
};

function staticServer(rootDir, { legacyImageFallback = false } = {}) {
  return createServer(async (req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(rootDir, reqPath);
    if (legacyImageFallback && reqPath.startsWith('/images/') && !existsSync(filePath)) {
      filePath = path.join(PUBLIC_IMAGES_DIR, reqPath.replace(/^\/images\//, ''));
    }
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
}

const FREEZE_CSS = `
  html { scroll-behavior: auto !important; }
  *, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }
`;

/**
 * A fullPage screenshot never scrolls the page for real, so `loading="lazy"`
 * images below the fold are still unresolved when the capture happens and
 * come out blank. Walk the page once, then wait for every <img> to decode.
 */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await sleep(60);
    }
    // Settle at the bottom before returning to the top: a lazy <img> that is
    // out of viewport again may never resolve `decode()`, so wait for the
    // loads while they are still in view, and cap the wait either way.
    const pending = [...document.images].filter((i) => !i.complete);
    await Promise.race([
      Promise.all(pending.map((i) => i.decode().catch(() => {}))),
      sleep(4000),
    ]);
    window.scrollTo(0, 0);
    await sleep(100);
  });
}

async function forceReveal(page, label) {
  if (label === 'new') {
    await page.evaluate(() => {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
    });
  } else {
    await page.evaluate(() => {
      document.querySelectorAll('.fade-in-section').forEach((el) => el.classList.add('is-visible'));
      document.querySelectorAll('[data-aos]').forEach((el) => el.classList.add('aos-animate'));
    });
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const distServer = staticServer(DIST_DIR);
  const legacyServer = staticServer(LEGACY_DIR, { legacyImageFallback: true });
  await listen(distServer, 4501);
  await listen(legacyServer, 4502);

  const sites = [
    { label: 'new', url: 'http://localhost:4501/' },
    { label: 'legacy', url: 'http://localhost:4502/' },
  ];

  const browser = await chromium.launch();
  const overflow = [];
  const issues = [];

  for (const { label, url } of sites) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addStyleTag({ content: FREEZE_CSS });

      const consoleErrors = [];
      const failedRequests = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('response', (res) => { if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`); });

      await page.goto(url, { waitUntil: 'networkidle' });
      await scrollThrough(page);
      await page.addStyleTag({ content: FREEZE_CSS });
      await forceReveal(page, label);
      // Back to the top after scrollThrough: the fixed navbar is painted at
      // the current scroll offset in a fullPage capture, so a stray offset
      // stamps the nav across the middle of the screenshot.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      overflow.push({ label, width, overflow: scrollWidth - clientWidth });
      if (consoleErrors.length || failedRequests.length) {
        issues.push({ label, width, consoleErrors, failedRequests });
      }

      await page.screenshot({ path: path.join(OUT_DIR, `${label}-${width}.png`), fullPage: true });
      await page.close();
    }
  }

  await browser.close();
  distServer.close();
  legacyServer.close();

  console.log(`Screenshots written to ${path.relative(process.cwd(), OUT_DIR)}/\n`);
  console.log('=== Horizontal overflow (want 0 at every width) ===');
  for (const r of overflow) {
    console.log(`${r.label.padEnd(7)} ${String(r.width).padEnd(5)} overflow=${r.overflow}${r.overflow > 0 ? '  <-- OVERFLOW' : ''}`);
  }

  console.log('\n=== Console errors / failed requests ===');
  console.log(issues.length ? JSON.stringify(issues, null, 2) : 'none');

  const failed = overflow.some((r) => r.overflow > 0);
  process.exit(failed ? 1 : 0);
}

main();
