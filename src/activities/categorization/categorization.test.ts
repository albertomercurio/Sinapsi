import { describe, expect, it } from 'vitest'
import { createRng } from '@/shared/lib/rng'
import { buildContentPack } from '@/content'
import words from '@/content/it/words.json'
import type { RunRecording } from '@/modules/measurement'
import { configFor, generate, score } from './logic'

const content = buildContentPack('it', words as never)
const device = {
  input: 'mouse',
  coarsePointer: false,
  screenW: 1,
  screenH: 1,
  viewportW: 1,
  viewportH: 1,
  dpr: 1,
  refreshHz: 60,
} as const

describe('categorization', () => {
  it('balances bins and gives each item a valid answer', () => {
    const config = configFor(3, 'adult')
    const inst = generate(createRng(2), config, content, 'adult')
    expect(inst.items).toHaveLength(config.items)
    expect(inst.categoryBins).toHaveLength(config.bins)
    for (const it of inst.items) {
      expect(inst.categoryBins[it.answer]!.key).toBe(it.stimulus.category)
    }
  })

  it('switches rule with a cue and both rules apply to every item', () => {
    const config = configFor(5, 'adult')
    const inst = generate(createRng(8), config, content, 'adult')
    expect(inst.items.some((i) => i.rule === 'size')).toBe(true)
    expect(inst.items.filter((i) => i.switchTrial).length).toBeGreaterThan(1)
    for (const it of inst.items) expect(it.otherAnswer).not.toBeNull()
  })

  it('counts perseverative errors after a switch', () => {
    const config = configFor(5, 'adult')
    const inst = generate(createRng(8), config, content, 'adult')
    // Respond always with the category answer: errors on size trials are perseverative when answers differ.
    const trials = inst.items.map((it, k) => {
      const catAnswer = it.rule === 'category' ? it.answer : it.otherAnswer!
      return {
        i: k,
        stimulus: { k },
        onset: 0,
        rt: 900,
        responses: [{ t: 900, input: 'mouse' as const, target: catAnswer, holdMs: 100 }],
      }
    })
    const rec: RunRecording = {
      startedAt: '',
      durationMs: 1,
      trials,
      samples: [],
      interruptions: [],
      device,
      stage: { width: 0, height: 0 },
    }
    const res = score(inst, rec, config)
    const expected = inst.items.filter(
      (it) => it.rule === 'size' && it.otherAnswer !== it.answer,
    ).length
    expect(res.metrics.perseverativeErrors).toBe(expected)
    expect(res.metrics.accuracy!).toBeLessThan(1)
  })
})
