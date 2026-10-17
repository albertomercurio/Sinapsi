import { describe, expect, it } from 'vitest'
import { createRng } from '@/shared/lib/rng'
import type { RunRecording } from '@/modules/measurement'
import { STAGE, configFor, generate, score } from './logic'

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

function run(indices: number[]) {
  const config = configFor(3, 'adult')
  const inst = generate(createRng(21), config)
  const rec: RunRecording = {
    startedAt: '',
    durationMs: 30000,
    trials: [
      {
        i: 0,
        stimulus: null,
        onset: 0,
        responses: indices.map((target, k) => ({
          t: 1000 + k * 1500,
          input: 'mouse',
          target,
          holdMs: 100,
        })),
      },
    ],
    samples: [],
    interruptions: [],
    device,
    stage: { width: 0, height: 0 },
  }
  return { inst, res: score(inst, rec, config), config }
}

describe('cancellation', () => {
  it('lays out items inside the stage without overlaps', () => {
    const config = configFor(5, 'adult')
    const inst = generate(createRng(3), config)
    expect(inst.items).toHaveLength(config.items)
    for (const it of inst.items) {
      expect(it.x).toBeGreaterThan(0)
      expect(it.x).toBeLessThan(STAGE.width)
      expect(it.y).toBeGreaterThan(0)
      expect(it.y).toBeLessThan(STAGE.height)
    }
    for (let i = 0; i < inst.items.length; i++) {
      for (let j = i + 1; j < inst.items.length; j++) {
        const d = Math.hypot(
          inst.items[i]!.x - inst.items[j]!.x,
          inst.items[i]!.y - inst.items[j]!.y,
        )
        expect(d).toBeGreaterThan(inst.radius)
      }
    }
  })

  it('scores a systematic left-to-right search of all targets as perfect and organized', () => {
    const inst = generate(createRng(21), configFor(3, 'adult'))
    const targets = inst.items.map((it, i) => ({ ...it, i })).filter((t) => t.target)
    const ordered = [...targets].sort((a, b) => a.x - b.x).map((t) => t.i)
    const { res } = run(ordered)
    expect(res.metrics.hitRate).toBe(1)
    expect(res.metrics.omissions).toBe(0)
    expect(res.metrics.cocX).toBeCloseTo(0, 5)
    expect(res.metrics.bestR!).toBeGreaterThan(0.9)
    // 60 items in 30 s (expected 36 s for adults) with perfect accuracy → above the 75% target.
    expect(res.score).toBeGreaterThan(75)
  })

  it('shows a leftward-negative asymmetry when right-side targets are missed', () => {
    const inst = generate(createRng(21), configFor(3, 'adult'))
    const leftOnly = inst.items
      .map((it, i) => ({ ...it, i }))
      .filter((t) => t.target && t.x < STAGE.width / 2)
      .map((t) => t.i)
    const { res } = run(leftOnly)
    expect(res.metrics.cocX!).toBeLessThan(-0.2)
    expect(res.metrics.rightOmissions!).toBeGreaterThan(0)
    expect(res.metrics.leftOmissions).toBe(0)
  })

  it('counts commissions and self-corrections', () => {
    const inst = generate(createRng(21), configFor(3, 'adult'))
    const distractor = inst.items.findIndex((it) => !it.target)
    const { res } = run([distractor, distractor, distractor])
    expect(res.metrics.selfCorrections).toBe(1)
    expect(res.metrics.commissions).toBe(1)
  })
})
