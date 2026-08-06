import type { Messages } from '../types';

export const en = {
  seo: {
    title: 'Ofek | Trusted Insights into Frontier Compute Manufacturing',
    description:
      'Ofek partners with top S&P 100 companies to optimize technology-focused manufacturing operations in Taiwan, drawing on deep supply-chain knowledge and HeatVision, our real-time manufacturing intelligence platform.',
  },
  language: {
    select: 'Select language',
    current: 'Language: English',
    switchTo: 'Switch language to',
  },
  menu: { open: 'Open Menu', close: 'Close Menu' },
  nav: {
    about: 'ABOUT US',
    consulting: 'CONSULTING',
    heatVision: 'HeatVision®',
    partners: 'PARTNERS',
    contact: 'TALK TO US',
  },
  hero: {
    headline: 'TRUSTED INSIGHTS INTO FRONTIER COMPUTE MANUFACTURING',
    lines: ['TRUSTED INSIGHTS INTO', 'FRONTIER COMPUTE MANUFACTURING'],
    strongLine: 1,
    cta: 'Talk to us',
    scrollLabel: 'Scroll to About Us',
  },
  about: {
    titleLight: 'US,',
    titleBold: 'IN A NUTSHELL',
    scrollLabel: 'Continue to Our Expertise and Intelligence',
    description:
      'Founded in 2020, Ofek partners with top S&P 100 companies to optimize their technology-focused manufacturing operations in Taiwan through tailored consultancy services. Drawing on deep knowledge of Taiwan’s supply chain and our engineering expertise, we build strong relationships with local manufacturers, helping partners navigate technical, cultural, and regional challenges for smoother operations.',
    features: [
      {
        title: 'Data-Driven Precision',
        text: 'To build on our expertise, we harness big data and machine learning—the engine behind HeatVision®—to continuously refine the gears that drive precise production control.',
      },
      {
        title: 'Global Collaboration',
        text: 'Our multilingual team, fluent in Mandarin, English, and several other languages, enables smooth collaboration between global customers and manufacturing counterparts.',
      },
      {
        title: 'Partner-First Value',
        text: "We prioritize, always, what's best for our partner, creating lasting value.",
      },
    ],
  },
  expertise: {
    titleLight: 'OUR',
    titleBold: 'EXPERTISE AND INTELLIGENCE',
    consultingTitleLight: 'Consulting',
    consultingTitleBold: 'Services',
    consultingBody:
      'We leverage our technical knowledge and local ecosystem insights to drive manufacturing improvements. Building long-term partnerships based on trust and transparency, creating lasting value.',
    heatVisionBody:
      'Our software brings real-time clarity from manufacturing to data center through big data analytics and machine learning, anticipating failures and eliminating the underlying causes.',
    heatVisionGraphLabels: {
      surfaceMountTechnology: 'Surface-Mount Technology',
      pickAndPlace: 'Pick & Place',
      automaticOpticalInspection: 'Automatic Optical Inspection',
      reflow: 'Reflow',
    },
  },
  partners: {
    titleLight: 'TRUSTED',
    titleBold: 'PARTNERS',
    ariaLabel: 'Trusted partners. Focus to pause the moving logos.',
  },
  footer: {
    offices: [
      { office: 'United States', address: '112 Capitol Trail, Newark, Delaware 19711, USA' },
      {
        office: 'Taiwan',
        address: 'No. 2, Sec. 1, Dunhua S. Rd., Songshan Dist., Taipei City 105408, Taiwan (R.O.C.)',
      },
    ],
    kicker: 'Contact Ofek',
    headingLight: 'Start a',
    headingBold: 'conversation',
    emailPrefix: 'Email us at',
    contactButton: 'Contact us',
    linkedInLabel: 'Ofek on LinkedIn',
    copyright: '© 2026 Ofek. All rights reserved.',
  },
} satisfies Messages;
