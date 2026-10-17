import { describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES } from '@/app/i18n/locales'
import { activities } from '@/modules/activities/registry'
import { loadGuide, REFERENCES, type GuideBlock, type GuideSection } from './content'
import { GUIDE_SECTION_IDS, metricGuideSection } from './sections'

const kind = (b: GuideBlock) => Object.keys(b)[0]
const size = (b: GuideBlock) => ('list' in b ? b.list.length : 'terms' in b ? b.terms.length : 1)
const shape = (s: GuideSection) => ({
  id: s.id,
  blocks: s.blocks.map((b) => `${kind(b)}:${size(b)}`),
  refs: s.refs ?? [],
})

describe('guide content', () => {
  it('has the same sections and structure in every language', async () => {
    const reference = (await loadGuide('it')).sections.map(shape)
    expect(reference.map((s) => s.id)).toEqual(GUIDE_SECTION_IDS)
    for (const { code } of SUPPORTED_LOCALES) {
      const guide = await loadGuide(code)
      expect({ code, sections: guide.sections.map(shape) }).toEqual({ code, sections: reference })
    }
  })

  it('cites only known references, and every reference is cited', async () => {
    const cited = [...new Set((await loadGuide('it')).sections.flatMap((s) => s.refs ?? []))]
    expect(cited.filter((key) => !REFERENCES[key])).toEqual([])
    expect(cited.sort()).toEqual(Object.keys(REFERENCES).sort())
  })

  it('explains every metric of every activity', () => {
    const missing = activities.flatMap((a) =>
      a.metrics.filter((m) => !metricGuideSection(m.key)).map((m) => `${a.id}.${m.key}`),
    )
    expect(missing).toEqual([])
  })
})
