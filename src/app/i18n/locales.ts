/**
 * Supported interface languages.
 *
 * To add a language: add an entry here, then add `<code>.json` next to every
 * existing `it.json` (run `pnpm i18n:check` to find missing files/keys), a
 * content pack in `src/content/<code>/` and the guide text in
 * `src/modules/guide/content/<code>.ts`. See docs/adding-a-language.md.
 */
export const SUPPORTED_LOCALES = [
  { code: 'it', label: 'Italiano', intl: 'it-IT' },
  { code: 'en', label: 'English', intl: 'en-GB' },
] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

export const DEFAULT_LOCALE: LocaleCode = 'it'

export function isSupportedLocale(code: string | null | undefined): code is LocaleCode {
  return SUPPORTED_LOCALES.some((l) => l.code === code)
}

export function intlLocale(code: LocaleCode): string {
  return SUPPORTED_LOCALES.find((l) => l.code === code)?.intl ?? 'it-IT'
}
