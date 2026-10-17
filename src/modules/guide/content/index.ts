import { DEFAULT_LOCALE } from '@/app/i18n/locales'
import type { GuideContent } from './types'

/** One file per language with the same section ids (checked by guide.test.ts). */
const loaders: Record<string, () => Promise<{ default: GuideContent }>> = {
  it: () => import('./it'),
  en: () => import('./en'),
}

export async function loadGuide(locale: string): Promise<GuideContent> {
  const load = loaders[locale] ?? loaders[DEFAULT_LOCALE]!
  return (await load()).default
}

export { REFERENCES } from './references'
export type { GuideBlock, GuideContent, GuideSection } from './types'
