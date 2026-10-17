import { CATEGORY_EMOJI, STIMULI, type Stimulus, type StimulusCategory } from './stimuli'

export interface WordPack {
  words: Record<string, string>
  categories: Record<StimulusCategory, string>
  attributes: Record<'big' | 'small' | 'living' | 'object', string>
}

/** Everything a generator may need for one language. */
export interface ContentPack {
  locale: string
  stimuli: Stimulus[]
  word(id: string): string
  category(c: StimulusCategory): string
  attribute(a: keyof WordPack['attributes']): string
  categoryEmoji: typeof CATEGORY_EMOJI
}

const packs = import.meta.glob<{ default: WordPack }>('./*/words.json')
const cache = new Map<string, ContentPack>()

export function buildContentPack(locale: string, words: WordPack): ContentPack {
  return {
    locale,
    stimuli: STIMULI,
    word: (id) => words.words[id] ?? id,
    category: (c) => words.categories[c] ?? c,
    attribute: (a) => words.attributes[a] ?? a,
    categoryEmoji: CATEGORY_EMOJI,
  }
}

/** Loads the content pack for a language, falling back to Italian. */
export async function loadContentPack(locale: string): Promise<ContentPack> {
  const hit = cache.get(locale)
  if (hit) return hit
  const loader = packs[`./${locale}/words.json`] ?? packs['./it/words.json']!
  const pack = buildContentPack(locale, (await loader()).default)
  cache.set(locale, pack)
  return pack
}

export { STIMULI, CATEGORY_EMOJI, type Stimulus, type StimulusCategory }
