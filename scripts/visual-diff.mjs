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
    ['expertise stripes', '.consulting-stripe .stripe-content'],
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

/** Exercises the mobile overlay and the dynamic navigation states that a
 * frozen full-page screenshot cannot prove. */
async function checkNavigation(browser, url) {
  const context = await browser.newContext({ viewport: { width: 425, height: 900 } });
  const page = await context.newPage();
  const problems = [];
  await page.goto(url, { waitUntil: 'networkidle' });

  const initial = await page.evaluate(() => {
    const title = document.querySelector('.hero-title')?.getBoundingClientRect();
    return {
      scrolled: document.querySelector('#navbar')?.classList.contains('nav-scrolled'),
      titleRight: title?.right ?? Infinity,
      viewportWidth: innerWidth,
    };
  });
  if (initial.scrolled) problems.push('navbar starts in its scrolled state');
  if (initial.titleRight > initial.viewportWidth) problems.push('mobile hero headline clips horizontally');

  const toggle = page.locator('#menu-toggle');
  await toggle.click();
  const open = await page.evaluate(() => ({
    expanded: document.querySelector('#menu-toggle')?.getAttribute('aria-expanded'),
    bodyLocked: document.body.classList.contains('nav-open'),
    menuOpen: document.querySelector('#nav-links')?.classList.contains('active'),
  }));
  if (open.expanded !== 'true' || !open.bodyLocked || !open.menuOpen) {
    problems.push('mobile menu open state is incomplete');
  }

  // Dispatch from the focused control rather than the page so headless
  // Chromium follows the same focus-navigation path as a real keyboard.
  await toggle.press('Tab');
  const tabState = await page.evaluate(() => ({
    passed: document.activeElement === document.querySelector('#nav-links a'),
    active: `${document.activeElement?.tagName}#${document.activeElement?.id}.${document.activeElement?.className}`,
  }));
  if (!tabState.passed) problems.push(`Tab does not move from the menu toggle to the first link (${tabState.active})`);

  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => ({
    expanded: document.querySelector('#menu-toggle')?.getAttribute('aria-expanded'),
    bodyLocked: document.body.classList.contains('nav-open'),
    focusReturned: document.activeElement?.id === 'menu-toggle',
  }));
  if (closed.expanded !== 'false' || closed.bodyLocked || !closed.focusReturned) {
    problems.push('Escape does not close the menu and return focus');
  }

  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const scrolled = await page.evaluate(() => ({
    navScrolled: document.querySelector('#navbar')?.classList.contains('nav-scrolled'),
    active: document.querySelector('.nav-links a.is-active')?.getAttribute('href'),
    progress: document.querySelector('[data-scroll-progress]')?.style.transform,
  }));
  if (!scrolled.navScrolled) problems.push('navbar does not enter its scrolled state');
  if (scrolled.active !== '#about') problems.push('About navigation link is not active in its section');
  if (!scrolled.progress?.startsWith('scaleX(')) problems.push('reading progress is not updated');

  await context.close();
  return problems;
}

/** Proves the desktop landing state keeps its logo and that the hero's two
 * visual planes travel at clearly different speeds during the first viewport. */
async function checkHeroLayering(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const problems = [];
  await page.goto(url, { waitUntil: 'networkidle' });

  const landingLogo = await page.evaluate(() => ({
    opacity: Number(getComputedStyle(document.querySelector('.logo')).opacity),
    source: document.querySelector('.logo img')?.currentSrc ?? '',
  }));
  if (landingLogo.opacity < 0.9 || !landingLogo.source.includes('Logo_Ofek_o')) {
    problems.push('original Ofek logo is not visible in the landing state');
  }

  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.5));
  await page.waitForTimeout(150);
  const layers = await page.evaluate(() => {
    const y = (selector) => {
      const transform = getComputedStyle(document.querySelector(selector)).transform;
      return transform === 'none' ? 0 : new DOMMatrix(transform).m42;
    };
    return { imageY: y('.hero-media img'), contentY: y('.hero-content') };
  });
  const separation = layers.imageY - layers.contentY;
  if (layers.imageY < 180 || separation < 180) {
    problems.push(`hero layers do not separate during scroll (image=${layers.imageY}, content=${layers.contentY})`);
  }

  await context.close();
  return problems;
}

/** Proves the partner rail contains one accessible seven-logo set plus one
 * decorative duplicate, moves left under normal motion, and settles into a
 * single static set for visitors who request reduced motion. */
async function checkPartnerMarquee(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const problems = [];
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#partners').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  const revealState = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        opacity: Number(style.opacity),
        clipPath: style.clipPath,
        top: rect.top,
        bottom: rect.bottom,
      };
    };
    return {
      viewportHeight: innerHeight,
      title: read('.partners-title'),
      strip: read('.partners-strip'),
      underline: (() => {
        const style = getComputedStyle(document.querySelector('.partners-title'), '::after');
        return { width: style.width, height: style.height, backgroundColor: style.backgroundColor };
      })(),
    };
  });
  const remainsClipped = (value) => value.includes('100%');
  if (
    revealState.title.opacity < 0.99 ||
    revealState.strip.opacity < 0.99 ||
    remainsClipped(revealState.title.clipPath) ||
    remainsClipped(revealState.strip.clipPath) ||
    revealState.underline.width !== '96px' ||
    revealState.underline.height !== '3px' ||
    revealState.underline.backgroundColor === 'rgba(0, 0, 0, 0)'
  ) {
    problems.push(`partner reveal remains hidden after entering the viewport (${JSON.stringify(revealState)})`);
  }

  const initial = await page.evaluate(() => {
    const track = document.querySelector('.partners-track');
    const transform = getComputedStyle(track).transform;
    return {
      groups: document.querySelectorAll('.partners-group').length,
      primaryLogos: document.querySelectorAll('.partners-group:not([aria-hidden="true"]) .logo-item').length,
      duplicateLogos: document.querySelectorAll('.partners-group[aria-hidden="true"] .logo-item').length,
      hasAws: Boolean(document.querySelector('.partners-group:not([aria-hidden="true"]) img[alt="Amazon Web Services"]')),
      animationName: getComputedStyle(track).animationName,
      x: transform === 'none' ? 0 : new DOMMatrix(transform).m41,
    };
  });
  await page.waitForTimeout(300);
  const laterX = await page.evaluate(() => {
    const transform = getComputedStyle(document.querySelector('.partners-track')).transform;
    return transform === 'none' ? 0 : new DOMMatrix(transform).m41;
  });

  if (initial.groups !== 2 || initial.primaryLogos !== 7 || initial.duplicateLogos !== 7 || !initial.hasAws) {
    problems.push(`partner rail structure is incomplete (${JSON.stringify(initial)})`);
  }
  if (initial.animationName !== 'partners-marquee' || laterX >= initial.x - 1) {
    problems.push(`partner rail does not move continuously left (before=${initial.x}, after=${laterX})`);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(50);
  const reduced = await page.evaluate(() => ({
    animationName: getComputedStyle(document.querySelector('.partners-track')).animationName,
    duplicateDisplay: getComputedStyle(document.querySelector('.partners-group[aria-hidden="true"]')).display,
  }));
  if (reduced.animationName !== 'none' || reduced.duplicateDisplay !== 'none') {
    problems.push(`reduced-motion partner fallback is not static (${JSON.stringify(reduced)})`);
  }

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
  const navigationProblems = await checkNavigation(browser, url);
  const heroProblems = await checkHeroLayering(browser, url);
  const partnerProblems = await checkPartnerMarquee(browser, url);

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

  console.log('\n=== Navigation interactions ===');
  console.log(navigationProblems.length ? navigationProblems.join('\n') : 'mobile menu, focus, active state and progress pass');

  console.log('\n=== Hero layering ===');
  console.log(heroProblems.length ? heroProblems.join('\n') : 'landing logo and differential image/text scroll pass');

  console.log('\n=== Partner rail ===');
  console.log(partnerProblems.length ? partnerProblems.join('\n') : 'seven-logo continuous marquee and reduced-motion fallback pass');

  const failed =
    overflow.some((r) => r.overflow > 0) ||
    issues.length > 0 ||
    noJsProblems.length > 0 ||
    navigationProblems.length > 0 ||
    heroProblems.length > 0 ||
    partnerProblems.length > 0;
  process.exit(failed ? 1 : 0);
}

main();
