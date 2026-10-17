import { describe, expect, it } from 'vitest'
import { movementSummary } from './kinematics'
import { fromByteaHex, packRecording, toByteaHex, unpackRecording } from './encode'
import { qualityFlags } from './quality'
import type { PointerSample, RunRecording } from './types'

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

describe('kinematics', () => {
  it('measures a straight movement as fully efficient with one sub-movement', () => {
    const samples: PointerSample[] = []
    for (let i = 0; i <= 30; i++) samples.push({ t: 100 + i * 16, x: i * 10, y: 0 })
    const m = movementSummary(samples, 0, { t: 600, x: 300, y: 0 })
    expect(m.initiationMs).toBe(100)
    expect(m.efficiency).toBeCloseTo(1, 5)
    expect(m.peaks).toBe(1)
    expect(m.reversals).toBe(0)
  })

  it('detects a detour, a pause and a correction', () => {
    const samples: PointerSample[] = []
    let t = 0
    // go up and right, overshoot past the target, stop, come back
    for (let i = 0; i <= 10; i++) samples.push({ t: (t += 16), x: i * 20, y: i * 10 })
    for (let i = 0; i < 20; i++) samples.push({ t: (t += 16), x: 200, y: 100 }) // 320 ms pause
    for (let i = 1; i <= 5; i++) samples.push({ t: (t += 16), x: 200 + i * 10, y: 100 - i * 20 })
    for (let i = 1; i <= 5; i++) samples.push({ t: (t += 16), x: 250 - i * 10, y: 0 })
    const m = movementSummary(samples, 0, { t: t + 16, x: 200, y: 0 })
    expect(m.efficiency!).toBeLessThan(0.6)
    expect(m.pauses).toBeGreaterThanOrEqual(1)
    expect(m.peaks).toBeGreaterThanOrEqual(2)
  })

  it('returns empty kinematics for a tap without samples', () => {
    const m = movementSummary([], 0, { t: 400, x: 10, y: 10 })
    expect(m.pathLength).toBe(0)
    expect(m.efficiency).toBeNull()
  })
})

describe('event log encoding', () => {
  it('round-trips a recording through deflate and bytea hex', () => {
    const rec: RunRecording<{ n: number }> = {
      startedAt: '2026-10-17T10:00:00.000Z',
      durationMs: 1234,
      trials: [
        {
          i: 0,
          stimulus: { n: 3 },
          onset: 10,
          responses: [{ t: 400, input: 'mouse', holdMs: 90 }],
          correct: true,
          rt: 390,
        },
      ],
      samples: [
        { t: 5, x: 1, y: 2 },
        { t: 21, x: 4, y: 8 },
        { t: 37, x: 9, y: 9 },
      ],
      interruptions: [],
      device,
      stage: { width: 800, height: 600 },
    }
    const bytes = packRecording(rec)
    const hex = toByteaHex(bytes)
    expect(hex.startsWith('\\x')).toBe(true)
    expect(unpackRecording(fromByteaHex(hex))).toEqual(rec)
  })
})

describe('quality flags', () => {
  it('flags interruptions and anticipations', () => {
    const trials = Array.from({ length: 20 }, (_, i) => ({
      i,
      stimulus: null,
      onset: 0,
      responses: [],
      rt: i < 5 ? 80 : 400,
    }))
    const flags = qualityFlags({
      startedAt: '',
      durationMs: 0,
      trials,
      samples: [],
      interruptions: [{ t: 1000, type: 'hidden', durationMs: 8000 }],
      device,
      stage: { width: 0, height: 0 },
    })
    expect(flags).toContain('interrupted')
    expect(flags).toContain('many_anticipations')
  })
})
