#!/usr/bin/env node
/*
 * Renders the branded link-preview cards (1200×630) into src/assets/images/og/.
 *
 *   node scripts/make-og.mjs
 *
 * Run it by hand after changing the hero headline, then commit the JPEGs. It is
 * not part of the build: text rendering through sharp/librsvg depends on the
 * fonts installed on the machine, so a CI-rendered card would not match. This
 * renders in Chromium with the site's own fonts (Google Fonts, network needed).
 */
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = path.join(ROOT, 'src/assets/images');
const OUT = path.join(IMAGES, 'og');

const { en } = await import('../src/i18n/locales/en.ts');
const { zhTw } = await import('../src/i18n/locales/zh-tw.ts');

const dataUrl = (mime, buffer) => `data:${mime};base64,${buffer.toString('base64')}`;
const banner = dataUrl(
  'image/jpeg',
  await sharp(path.join(IMAGES, 'Banner.png')).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer(),
);
const logo = dataUrl('image/png', await readFile(path.join(IMAGES, 'Logo_Ofek_o.png')));

const card = ({ hero }, lang) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; padding: 72px 80px;
    display: flex; flex-direction: column; justify-content: space-between;
    background: linear-gradient(90deg, rgb(13 15 16 / 88%) 0%, rgb(13 15 16 / 55%) 60%, rgb(13 15 16 / 25%) 100%),
      url(${banner}) center / cover;
    color: #fff;
    font-family: Lato, 'PingFang TC', 'Noto Sans TC', sans-serif;
  }
  img { width: 150px; filter: brightness(0) invert(1); }
  h1 { font-size: 58px; line-height: 1.14; letter-spacing: 0.1em; text-transform: uppercase; }
  h1 span { display: block; font-weight: 300; }
  h1 span.strong { font-weight: 700; }
  .rule { width: 160px; height: 4px; margin-top: 28px; background: #4da7a8; }
</style></head>
<body>
  <img src="${logo}" alt="">
  <div>
    <h1>${hero.lines.map((line, i) => `<span class="${i === hero.strongLine ? 'strong' : ''}">${line}</span>`).join('')}</h1>
    <div class="rule"></div>
  </div>
</body></html>`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [name, messages, lang] of [['og-en', en, 'en'], ['og-zh-tw', zhTw, 'zh-TW']]) {
  await page.setContent(card(messages, lang), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
  console.log(`wrote src/assets/images/og/${name}.jpg`);
}
await browser.close();
