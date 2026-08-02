// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Must match the CNAME exactly, including `www` — a mismatch produces
  // canonical/OG URLs that 301 and split the SEO signal.
  site: 'https://www.ofektaiwan.com',

  // Deliberately NO `base`. Setting one on a custom domain silently breaks
  // every asset URL. See plan risk R1.

  output: 'static',
  trailingSlash: 'ignore',

  // Astro 7 strips whitespace with JSX rules. The heading language here is two
  // adjacent inline spans separated by a literal space, so keep HTML intact
  // until Phase 3 has moved that spacing into CSS. See plan risk R3.
  compressHTML: false,
});
