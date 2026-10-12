import type { APIRoute } from 'astro';
import { site } from '../data/site';

/*
 * Both builds advertise the canonical domain's sitemap (see CANONICAL_DOMAIN
 * in src/data/site-profiles.ts), so the secondary site sends crawlers to the
 * copy that should be indexed.
 */
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${site.canonicalUrl}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
