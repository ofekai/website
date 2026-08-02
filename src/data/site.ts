export const site = {
  name: 'Ofek',
  url: 'https://www.ofektaiwan.com',
  email: 'contact@ofektaiwan.com',
  linkedin: 'https://www.linkedin.com/company/ofekglobal',
} as const;

/**
 * Phase 1 keeps every nav item as-is for parity, including `#resources`, which
 * has no matching element in the document. Phase 2 removes it.
 */
export const navLinks = [
  { label: 'ABOUT US', href: '#about' },
  { label: 'CONSULTING', href: '#consulting' },
  { label: 'HeatVision®', href: '#heatVision' },
  { label: 'RESOURCES', href: '#resources' },
  { label: 'PARTNERS', href: '#partners' },
  { label: 'TALK TO US', href: '#contact' },
] as const;

export const addresses = [
  'USA｜ 112 Capitol trail , Newark , Delaware 19711 USA',
  'TW ｜ No. 2, Sec. 1, Dunhua S. Rd., Songshan Dist., Taipei City 105408, Taiwan (R.O.C.) ',
] as const;
