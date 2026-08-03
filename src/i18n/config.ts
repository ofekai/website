import type { Locale, LocaleDefinition } from './types';

export const defaultLocale: Locale = 'en';

export const localeOrder = ['en', 'zh-tw'] as const satisfies readonly Locale[];

export const locales = {
  en: {
    path: '/',
    htmlLang: 'en',
    direction: 'ltr',
    ogLocale: 'en_US',
    label: 'English',
    shortLabel: 'EN',
  },
  'zh-tw': {
    path: '/zh-tw/',
    htmlLang: 'zh-TW',
    direction: 'ltr',
    ogLocale: 'zh_TW',
    label: '繁體中文',
    shortLabel: '繁中',
  },
} as const satisfies Record<Locale, LocaleDefinition>;

export function localePath(locale: Locale): LocaleDefinition['path'] {
  return locales[locale].path;
}
