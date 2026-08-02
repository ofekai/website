// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Must match the CNAME exactly, including `www` — a mismatch produces
  // canonical/OG URLs that 301 and split the SEO signal.
  site: 'https://www.ofektaiwan.com',

  // Deliberately NO `base`. Setting one on a custom domain silently breaks
  // every asset URL. See plan risk R1.

  output: 'static',
  trailingSlash: 'ignore',

  // Self-hosted at build time via astro:fonts, replacing the Google Fonts
  // <link> tags. Lato ships 100/300/400/700/900 only — 300/400/700 are the
  // only weights the design actually uses (see the weight remap in
  // global.css); no italic style is used anywhere in the markup.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Lato',
      cssVariable: '--font-lato',
      weights: [300, 400, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
  ],

  // Astro 7 strips whitespace with JSX rules. The heading language here is two
  // adjacent inline spans separated by a literal space, so keep HTML intact
  // until Phase 3 has moved that spacing into CSS. See plan risk R3.
  compressHTML: false,
});
