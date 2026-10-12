import { CANONICAL_DOMAIN, type SiteProfile } from './site-profiles';

/*
 * Replaced at build time by vite.define in astro.config.mjs, which is where the
 * env read lives. Declared rather than imported because src/ has no `process`.
 */
declare const __SITE_PROFILE__: SiteProfile;

const profile = __SITE_PROFILE__;

export const site = {
  name: 'Ofek',
  /** This build's own origin: CNAME, and absolute asset URLs. */
  url: `https://${profile.domain}`,
  /** The origin search engines are told to index; see CANONICAL_DOMAIN. */
  canonicalUrl: `https://${CANONICAL_DOMAIN}`,
  email: profile.email,
  foundingDate: '2020',
  linkedin: 'https://www.linkedin.com/company/ofekglobal',
} as const;

export const addresses = [
  {
    '@type': 'PostalAddress',
    streetAddress: '112 Capitol Trail',
    addressLocality: 'Newark',
    addressRegion: 'DE',
    postalCode: '19711',
    addressCountry: 'US',
  },
  {
    '@type': 'PostalAddress',
    streetAddress: 'No. 2, Sec. 1, Dunhua S. Rd., Songshan Dist.',
    addressLocality: 'Taipei City',
    postalCode: '105408',
    addressCountry: 'TW',
  },
] as const;
