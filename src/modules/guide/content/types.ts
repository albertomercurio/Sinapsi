/** Long-form, plain-language guide content (one file per language, same section ids). */
export type GuideBlock =
  | { p: string }
  | { h: string }
  | { list: string[] }
  | { terms: { term: string; def: string }[] }
  | { example: string }

export interface GuideSection {
  id: string
  title: string
  blocks: GuideBlock[]
  /** Keys of REFERENCES. */
  refs?: string[]
}

export interface GuideContent {
  title: string
  intro: string
  sections: GuideSection[]
}
