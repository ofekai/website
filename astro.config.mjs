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

  i18n: {
    locales: ['en', 'zh-tw'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },

  // The reference site's exact pairing, fetched at build time and self-hosted
  // so the static GitHub Pages deployment has no runtime font dependency.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Lato',
      cssVariable: '--font-lato',
      weights: [300, 400, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
    {
      provider: fontProviders.google(),
      name: 'Open Sans',
      cssVariable: '--font-open-sans',
      weights: [300, 400, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
  ],

  // Adjacent inline spans in the title components include intentional literal
  // spaces, so preserve their authored HTML.
  compressHTML: false,
});
