import { describe, expect, it } from 'vitest'
import { createRng } from '@/shared/lib/rng'
import type { RunRecording, TrialRecord } from '@/modules/measurement'
import { configFor, generate, score } from './logic'

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

function simulate(seed: number, opts: { rt: number; commitOnNogo: number; missRate: number }) {
  const config = configFor(3, 'adult')
  const instance = generate(createRng(seed), config)
  const rng = createRng(seed + 1)
  let t = 0
  const trials: TrialRecord[] = instance.trials.map((tr, i) => {
    t += tr.isiMs
    const onset = t
    let responds = tr.kind === 'go' ? rng.next() > opts.missRate : rng.next() < opts.commitOnNogo
    const rt = Math.round(opts.rt + rng.exponential(80) + rng.normal(0, 30))
    if (rt > config.responseWindowMs) responds = false
    t += config.responseWindowMs
    return {
      i,
      stimulus: { kind: tr.kind },
      onset,
      responses: responds ? [{ t: onset + rt, input: 'mouse', holdMs: 110 }] : [],
      rt: responds ? rt : null,
    }
  })
  const rec: RunRecording = {
    startedAt: '',
    durationMs: t,
    trials,
    samples: [],
    interruptions: [],
    device,
    stage: { width: 0, height: 0 },
  }
  return { instance, rec, config }
}

describe('go-no-go', () => {
  it('generates the exact go ratio, starting with go trials, no triple no-go', () => {
    const config = configFor(3, 'adult')
    const inst = generate(createRng(5), config)
    expect(inst.trials).toHaveLength(config.trials)
    expect(inst.trials.filter((t) => t.kind === 'go')).toHaveLength(
      Math.round(config.trials * config.goRatio),
    )
    expect(inst.trials[0]!.kind).toBe('go')
    const kinds = inst.trials.map((t) => t.kind).join(',')
    expect(kinds.includes('nogo,nogo,nogo')).toBe(false)
  })

  it('is deterministic for a seed', () => {
    const config = configFor(2, 'senior')
    expect(generate(createRng(9), config)).toEqual(generate(createRng(9), config))
  })

  it('makes levels harder: shorter windows, more trials', () => {
    expect(configFor(5, 'adult').responseWindowMs).toBeLessThan(
      configFor(1, 'adult').responseWindowMs,
    )
    expect(configFor(5, 'adult').trials).toBeGreaterThan(configFor(1, 'adult').trials)
    expect(configFor(3, 'child').stimulusSet).toBe('sea')
  })

  it('scores a careful fast responder above an impulsive one', () => {
    const good = simulate(1, { rt: 380, commitOnNogo: 0.05, missRate: 0.02 })
    const impulsive = simulate(1, { rt: 300, commitOnNogo: 0.6, missRate: 0.02 })
    const a = score(good.instance, good.rec, good.config, 250)
    const b = score(impulsive.instance, impulsive.rec, impulsive.config, 250)
    expect(a.metrics.dPrime!).toBeGreaterThan(b.metrics.dPrime!)
    expect(b.metrics.commissions!).toBeGreaterThan(a.metrics.commissions!)
    expect(a.score).toBeGreaterThan(b.score)
    expect(a.metrics.decisionTime).toBeGreaterThan(0)
    expect(a.performance).toBeGreaterThan(0)
    expect(a.performance).toBeLessThanOrEqual(1)
  })
})
