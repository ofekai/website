import type { APIRoute } from 'astro';
import { localeOrder, locales } from '../i18n';
import { site } from '../data/site';

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Canonical URLs on both builds; see CANONICAL_DOMAIN in src/data/site-profiles.ts.
const absoluteUrl = (path: string) => new URL(path, site.canonicalUrl).href;
const lastmod = new Date().toISOString().slice(0, 10);

const alternateLinks = localeOrder
  .map((locale) => {
    const definition = locales[locale];
    return `<xhtml:link rel="alternate" hreflang="${escapeXml(definition.htmlLang)}" href="${escapeXml(absoluteUrl(definition.path))}" />`;
  })
  .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl('/'))}" />`)
  .join('');

const urls = localeOrder
  .map((locale) => {
    const definition = locales[locale];
    return `<url><loc>${escapeXml(absoluteUrl(definition.path))}</loc><lastmod>${lastmod}</lastmod>${alternateLinks}<changefreq>monthly</changefreq><priority>${locale === 'en' ? '1.0' : '0.9'}</priority></url>`;
  })
  .join('');

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
