import { createI18n } from 'vue-i18n'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  intlLocale,
  isSupportedLocale,
  type LocaleCode,
} from './locales'
import { loadMessages } from './messages'

const STORAGE_KEY = 'sinapsi.locale'

const datetimeFormats = Object.fromEntries(
  SUPPORTED_LOCALES.map((l) => [
    l.code,
    {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      medium: { day: 'numeric', month: 'short', year: 'numeric' },
      long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      time: { hour: '2-digit', minute: '2-digit' },
      dateTime: {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
      monthShort: { month: 'short' },
    },
  ]),
) as unknown as Record<LocaleCode, Record<string, Intl.DateTimeFormatOptions>>

const numberFormats = Object.fromEntries(
  SUPPORTED_LOCALES.map((l) => [
    l.code,
    {
      integer: { maximumFractionDigits: 0 },
      decimal1: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
      decimal2: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      percent: { style: 'percent', maximumFractionDigits: 0 },
      ms: { style: 'unit', unit: 'millisecond', unitDisplay: 'short', maximumFractionDigits: 0 },
      seconds: { style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1 },
    },
  ]),
) as unknown as Record<LocaleCode, Record<string, Intl.NumberFormatOptions>>

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {},
  datetimeFormats,
  numberFormats,
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
})

const loaded = new Set<LocaleCode>()

export async function ensureLocaleLoaded(code: LocaleCode): Promise<void> {
  if (loaded.has(code)) return
  const messages = await loadMessages(code)
  i18n.global.setLocaleMessage(code, messages as never)
  loaded.add(code)
}

export async function setLocale(code: LocaleCode): Promise<void> {
  await ensureLocaleLoaded(code)
  if (code !== DEFAULT_LOCALE) await ensureLocaleLoaded(DEFAULT_LOCALE)
  i18n.global.locale.value = code
  document.documentElement.lang = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // storage unavailable (private mode): the choice simply isn't remembered
  }
}

export function initialLocale(): LocaleCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(saved)) return saved
  } catch {
    // ignore
  }
  const browser = navigator.language?.slice(0, 2)
  return isSupportedLocale(browser) ? browser : DEFAULT_LOCALE
}

export function currentLocale(): LocaleCode {
  return i18n.global.locale.value as LocaleCode
}

export { intlLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale, type LocaleCode }
