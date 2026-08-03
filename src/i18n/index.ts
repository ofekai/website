import { en } from './locales/en';
import { zhTw } from './locales/zh-tw';
import type { Locale, Messages } from './types';

export { defaultLocale, localeOrder, localePath, locales } from './config';
export type { Locale, LocaleDefinition, Messages, TextDirection } from './types';

const messages = { en, 'zh-tw': zhTw } satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}
