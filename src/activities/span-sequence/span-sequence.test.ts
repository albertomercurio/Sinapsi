import { describe, expect, it } from 'vitest'
import { createRng } from '@/shared/lib/rng'
import type { RunRecording, TrialRecord } from '@/modules/measurement'
import { configFor, expectedAnswer, generate, lengthToDifficulty, score } from './logic'

const device = {
  input: 'touch',
  coarsePointer: true,
  screenW: 1,
  screenH: 1,
  viewportW: 1,
  viewportH: 1,
  dpr: 1,
  refreshHz: 60,
} as const

function rec(trials: TrialRecord[]): RunRecording {
  return {
    startedAt: '',
    durationMs: 1,
    trials,
    samples: [],
    interruptions: [],
    device,
    stage: { width: 0, height: 0 },
  }
}

describe('span-sequence', () => {
  it('generates spatial sequences without repeated tiles for every length', () => {
    const config = configFor(3, 'adult')
    const inst = generate(createRng(1), config)
    for (let len = config.minLength; len <= config.maxLength; len++) {
      for (const seq of inst.pools[len]!) {
        expect(seq).toHaveLength(len)
        expect(new Set(seq).size).toBe(len)
      }
    }
  })

  it('maps longer and backward sequences to higher item difficulty', () => {
    expect(lengthToDifficulty(2, 'forward')).toBe(1)
    expect(lengthToDifficulty(7, 'forward')).toBe(5)
    expect(lengthToDifficulty(4, 'backward')).toBeGreaterThan(lengthToDifficulty(4, 'forward'))
  })

  it('separates item and order errors and gives partial credit', () => {
    const config = { ...configFor(2, 'adult'), direction: 'forward' as const }
    const seq = [1, 4, 7]
    const responses = (vals: number[]) =>
      vals.map((v, k) => ({ t: 1000 + k * 400, input: 'touch' as const, target: v, holdMs: 80 }))
    const r = score(
      { pools: {} },
      rec([
        { i: 0, stimulus: { seq }, onset: 0, responses: responses([1, 4, 7]) }, // perfect
        { i: 1, stimulus: { seq }, onset: 0, responses: responses([4, 1, 7]) }, // 2 order errors, 1/3 in place
        { i: 2, stimulus: { seq }, onset: 0, responses: responses([1, 5, 7]) }, // 1 item error
      ]),
      config,
    )
    expect(r.metrics.correctTrials).toBe(1)
    expect(r.metrics.orderErrors).toBe(2)
    expect(r.metrics.itemErrors).toBe(1)
    expect(r.metrics.pcuScore).toBeCloseTo((1 + 1 / 3 + 2 / 3) / 3, 4)
    expect(r.items).toHaveLength(3)
    expect(expectedAnswer([1, 2, 3], 'backward')).toEqual([3, 2, 1])
  })
})
