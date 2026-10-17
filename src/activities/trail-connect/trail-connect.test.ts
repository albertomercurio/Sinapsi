import { describe, expect, it } from 'vitest'
import { createRng } from '@/shared/lib/rng'
import type { RunRecording, TrialRecord } from '@/modules/measurement'
import { configFor, generate, labelsFor, score } from './logic'

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

function part(n: number, linkMs: number, errorsAt: number[] = []): TrialRecord {
  const responses = []
  let t = 1000
  for (let i = 1; i < n; i++) {
    if (errorsAt.includes(i))
      responses.push({ t: (t += 300), input: 'mouse' as const, target: (i + 3) % n, holdMs: 90 })
    responses.push({ t: (t += linkMs), input: 'mouse' as const, target: i, holdMs: 90 })
  }
  return { i: 0, stimulus: null, onset: 1000, responses, extra: { complete: true } }
}

describe('trail-connect', () => {
  it('builds alternating labels for part B', () => {
    expect(labelsFor('A', 4)).toEqual(['1', '2', '3', '4'])
    expect(labelsFor('B', 6)).toEqual(['1', 'A', '2', 'B', '3', 'C'])
  })

  it('places nodes apart and inside the stage', () => {
    const inst = generate(createRng(4), configFor(5, 'adult'), 'adult')
    for (const p of inst.parts) {
      for (let i = 0; i < p.nodes.length; i++) {
        for (let j = i + 1; j < p.nodes.length; j++) {
          expect(
            Math.hypot(p.nodes[i]!.x - p.nodes[j]!.x, p.nodes[i]!.y - p.nodes[j]!.y),
          ).toBeGreaterThan(2 * inst.radius)
        }
      }
    }
  })

  it('computes B−A, B/A and errors; slower B scores lower', () => {
    const config = configFor(3, 'adult')
    const inst = generate(createRng(4), config, 'adult')
    const rec = (bLink: number, errors: number[]): RunRecording => ({
      startedAt: '',
      durationMs: 1,
      trials: [part(config.nodes, 1000), { ...part(config.nodes, bLink, errors), i: 1 }],
      samples: [],
      interruptions: [],
      device,
      stage: { width: 0, height: 0 },
    })
    const fast = score(inst, rec(1200, []))
    const slow = score(inst, rec(2600, [3, 5]))
    expect(fast.metrics.timeA).toBeCloseTo(((config.nodes - 1) * 1000) / 1000, 5)
    expect(slow.metrics.errorsB).toBe(2)
    expect(slow.metrics.bMinusA!).toBeGreaterThan(fast.metrics.bMinusA!)
    expect(slow.metrics.bOverA!).toBeGreaterThan(2)
    expect(slow.score).toBeLessThan(fast.score)
  })
})
