#!/usr/bin/env node
/**
 * Screenshots the built site at a fixed set of widths and runs the
 * cross-cutting checks every phase gate calls for: no horizontal overflow at
 * any width, no console errors, no failed requests, and — with JavaScript
 * switched off — a page that is still fully laid out and readable.
 *
 * Usage: npm run build && node scripts/visual-diff.mjs
 * Screenshots land in .visual-diff/ (gitignored).
 *
 * Phase 6 removed the side-by-side comparison against _legacy/index.html
 * along with _legacy/ itself; the migration it existed to police is finished.
 *
 * [data-reveal] elements are forced to their settled state before capture — a
 * fullPage screenshot never scrolls anything into view for real, so the
 * IntersectionObserver driving them never fires and below-the-fold sections
 * would otherwise capture at opacity:0.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const OUT_DIR = path.join(PROJECT_ROOT, '.visual-diff');

const WIDTHS = [1440, 1200, 1100, 1000, 900, 868, 768, 425];

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
};

function staticServer(rootDir) {
  return createServer(async (req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);
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

async function forceReveal(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
  });
}

/**
 * With JavaScript off, every reveal's initial hidden state is gated away in
 * CSS and the page should render complete. Verified with locator geometry
 * rather than page.evaluate — script evaluation never resolves in a
 * javaScriptEnabled:false context and the call hangs forever.
 */
async function checkNoJs(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });

  const problems = [];
  const mustBeVisible = [
    ['hero headline', 'h1.hero-title'],
    ['hero CTA', '.hero-content .btn-outline'],
    ['about copy', '.about-section .description'],
    ['expertise cards', '.diagonal-card-1'],
    ['partners strip', '.partners-strip'],
    ['footer', '.footer-brand'],
  ];

  for (const [label, selector] of mustBeVisible) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box || box.width < 1 || box.height < 1) problems.push(`${label} (${selector}) not laid out`);
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'nojs-1200.png'), fullPage: true });
  await context.close();
  return problems;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const distServer = staticServer(DIST_DIR);
  await listen(distServer, 4501);
  const url = 'http://localhost:4501/';

  const browser = await chromium.launch();
  const overflow = [];
  const issues = [];

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
    await forceReveal(page);
    // Back to the top after scrollThrough: the fixed navbar is painted at
    // the current scroll offset in a fullPage capture, so a stray offset
    // stamps the nav across the middle of the screenshot.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    overflow.push({ width, overflow: scrollWidth - clientWidth });
    if (consoleErrors.length || failedRequests.length) {
      issues.push({ width, consoleErrors, failedRequests });
    }

    await page.screenshot({ path: path.join(OUT_DIR, `page-${width}.png`), fullPage: true });
    await page.close();
  }

  const noJsProblems = await checkNoJs(browser, url);

  await browser.close();
  distServer.close();

  console.log(`Screenshots written to ${path.relative(process.cwd(), OUT_DIR)}/\n`);
  console.log('=== Horizontal overflow (want 0 at every width) ===');
  for (const r of overflow) {
    console.log(`${String(r.width).padEnd(5)} overflow=${r.overflow}${r.overflow > 0 ? '  <-- OVERFLOW' : ''}`);
  }

  console.log('\n=== Console errors / failed requests ===');
  console.log(issues.length ? JSON.stringify(issues, null, 2) : 'none');

  console.log('\n=== JavaScript disabled ===');
  console.log(noJsProblems.length ? noJsProblems.join('\n') : 'all sections laid out');

  const failed = overflow.some((r) => r.overflow > 0) || issues.length > 0 || noJsProblems.length > 0;
  process.exit(failed ? 1 : 0);
}

main();
