export type Locale = 'en' | 'zh-tw';

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleDefinition {
  path: '/' | `/${string}/`;
  htmlLang: string;
  direction: TextDirection;
  ogLocale: string;
  label: string;
  shortLabel: string;
}

export interface Messages {
  seo: {
    title: string;
    description: string;
  };
  language: {
    select: string;
    current: string;
    switchTo: string;
  };
  menu: {
    open: string;
    close: string;
  };
  nav: {
    about: string;
    consulting: string;
    heatVision: string;
    partners: string;
    contact: string;
  };
  hero: {
    headline: string;
    lines: readonly string[];
    strongLine: number;
    cta: string;
    scrollLabel: string;
  };
  about: {
    titleLight: string;
    titleBold: string;
    description: string;
    scrollLabel: string;
    features: readonly [
      { title: string; text: string },
      { title: string; text: string },
      { title: string; text: string },
    ];
  };
  expertise: {
    titleLight: string;
    titleBold: string;
    consultingTitleLight: string;
    consultingTitleBold: string;
    consultingBody: string;
    consultingScrollLabel: string;
    heatVisionBody: string;
    heatVisionScrollLabel: string;
    heatVisionGraphLabels: {
      surfaceMountTechnology: string;
      pickAndPlace: string;
      automaticOpticalInspection: string;
      reflow: string;
    };
  };
  partners: {
    titleLight: string;
    titleBold: string;
    ariaLabel: string;
  };
  footer: {
    offices: readonly [
      { office: string; address: string; addressDirection?: TextDirection },
      { office: string; address: string; addressDirection?: TextDirection },
    ];
    kicker: string;
    headingLight: string;
    headingBold: string;
    emailPrefix: string;
    contactButton: string;
    linkedInLabel: string;
    copyright: string;
  };
}
