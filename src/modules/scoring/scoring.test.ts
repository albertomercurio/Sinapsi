import { describe, expect, it } from 'vitest'
import { createRng } from '@/shared/lib/rng'
import {
  Staircase,
  abilityAsLevel,
  analyzeTrend,
  bestR,
  centerOfCancellation,
  expectedOutcome,
  fatigueIndex,
  fitExGauss,
  initialAbility,
  intersectionRate,
  inverseEfficiency,
  levelToRating,
  logNormCdf,
  lowess,
  mad,
  mannKendall,
  median,
  meanInterCancellationDistance,
  nextDifficulty,
  normCdf,
  postErrorSlowing,
  probit,
  rateCorrect,
  ratingToLevel,
  signalDetection,
  signedResidualTime,
  summarizeRt,
  theilSen,
  updateAbility,
  vigilanceDecrement,
} from './index'

// Reference values computed independently with Python's statistics.NormalDist.
describe('normal distribution', () => {
  it('matches reference quantiles and probabilities', () => {
    expect(probit(0.975)).toBeCloseTo(1.9599639845, 6)
    expect(probit(0.001)).toBeCloseTo(-3.0902323062, 6)
    expect(normCdf(1.96)).toBeCloseTo(0.9750021049, 6)
  })
  it('keeps precision deep in the tail', () => {
    expect(logNormCdf(-30)).toBeCloseTo(-454.3212, 2)
    expect(Number.isFinite(logNormCdf(-60))).toBe(true)
  })
})

describe('signal detection', () => {
  it('computes log-linear corrected d′ and c', () => {
    const r = signalDetection({ hits: 20, misses: 5, falseAlarms: 3, correctRejections: 22 })
    expect(r.dPrime).toBeCloseTo(1.9059303, 5)
    expect(r.criterion).toBeCloseTo(0.1518706, 5)
    expect(r.aPrime).toBeCloseTo(0.9056818, 6)
  })
  it('stays finite with perfect performance', () => {
    const r = signalDetection({ hits: 30, misses: 0, falseAlarms: 0, correctRejections: 10 })
    expect(Number.isFinite(r.dPrime!)).toBe(true)
    expect(r.dPrime!).toBeGreaterThan(2.5)
  })
})

describe('reaction times', () => {
  it('flags anticipations and slow outliers', () => {
    const rts = [100, 420, 430, 440, 450, 460, 470, 480, 2500]
    const s = summarizeRt(rts)
    expect(s.anticipations).toBe(1)
    expect(s.slowOutliers).toBe(1)
    expect(s.trimmed.n).toBe(7)
    expect(s.trimmed.median).toBe(450)
    expect(median([1, 3, 2])).toBe(2)
    expect(mad([1, 1, 1])).toBe(0)
  })

  it('recovers ex-Gaussian parameters from simulated data', () => {
    const rng = createRng(2026)
    const truth = { mu: 420, sigma: 45, tau: 130 }
    const xs = Array.from(
      { length: 3000 },
      () => rng.normal(truth.mu, truth.sigma) + rng.exponential(truth.tau),
    )
    const fit = fitExGauss(xs)!
    expect(fit.converged).toBe(true)
    expect(fit.mu).toBeGreaterThan(truth.mu * 0.94)
    expect(fit.mu).toBeLessThan(truth.mu * 1.06)
    expect(fit.sigma).toBeGreaterThan(truth.sigma * 0.8)
    expect(fit.sigma).toBeLessThan(truth.sigma * 1.2)
    expect(fit.tau).toBeGreaterThan(truth.tau * 0.88)
    expect(fit.tau).toBeLessThan(truth.tau * 1.12)
  })

  it('refuses to fit tiny samples', () => {
    expect(fitExGauss([400, 500, 600])).toBeNull()
  })
})

describe('speed–accuracy', () => {
  it('computes IES and RCS', () => {
    expect(inverseEfficiency(500, 0.8)).toBe(625)
    expect(inverseEfficiency(500, 0)).toBeNull()
    expect(rateCorrect(10, 5000)).toBe(2)
  })
  it('implements the signed residual time rule', () => {
    const r = signedResidualTime(
      [
        { correct: true, rtMs: 0 }, // +1
        { correct: false, rtMs: 0 }, // −1
        { correct: true, rtMs: 500 }, // +0.5
        { correct: true, rtMs: null }, // omission: 0
      ],
      1000,
    )!
    expect(r.mean).toBeCloseTo(0.125, 10)
    expect(r.normalized).toBeCloseTo(0.5625, 10)
  })
})

describe('sequential effects', () => {
  it('computes robust post-error slowing', () => {
    const trials = [
      { correct: true, rt: 400 },
      { correct: false, rt: 350 },
      { correct: true, rt: 520 },
      { correct: true, rt: 410 },
      { correct: false, rt: 300 },
      { correct: true, rt: 470 },
    ]
    // (520 − 400) and (470 − 410)
    expect(postErrorSlowing(trials)).toEqual({ pes: 90, n: 2 })
  })
  it('detects slowing over time on task', () => {
    const trials = Array.from({ length: 60 }, (_, i) => ({
      correct: true,
      rt: 400 + i * 2,
      t: i * 2000,
    }))
    const v = vigilanceDecrement(trials)
    // 2 ms per trial, 30 trials per minute → 60 ms/min
    expect(v.rtSlopePerMin).toBeCloseTo(60, 6)
    expect(fatigueIndex(trials.map((t) => t.rt))).toBeGreaterThan(1)
  })
})

describe('spatial search metrics', () => {
  const targets = [-1, -0.5, 0, 0.5, 1].map((x) => ({ x: (x + 1) * 100, y: 50 }))
  it('center of cancellation is 0 when all targets are found', () => {
    expect(
      centerOfCancellation(
        targets,
        targets.map(() => true),
      ).x,
    ).toBeCloseTo(0, 10)
  })
  it('center of cancellation shifts left when only left targets are found', () => {
    const cancelled = [true, true, false, false, false]
    expect(centerOfCancellation(targets, cancelled).x).toBeCloseTo(-0.75, 10)
  })
  it('best r is high for systematic row-by-row search', () => {
    const path = [] as { x: number; y: number }[]
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 5; col++) path.push({ x: col * 50, y: row * 50 })
    expect(bestR(path)!).toBeGreaterThan(0.9)
  })
  it('counts self-intersections of the search path', () => {
    const bowtie = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]
    expect(intersectionRate(bowtie)).toBeCloseTo(0.25, 10)
    expect(
      meanInterCancellationDistance(
        [
          { x: 0, y: 0 },
          { x: 3, y: 4 },
        ],
        10,
      ),
    ).toBeCloseTo(0.5, 10)
  })
})

describe('trend statistics', () => {
  it('Theil–Sen ignores a gross outlier', () => {
    const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const ys = xs.map((x) => 2 * x + 1)
    ys[7] = 100
    const fit = theilSen(xs, ys)
    expect(fit.slope).toBeCloseTo(2, 10)
    expect(fit.intercept).toBeCloseTo(1, 10)
  })
  it('Mann–Kendall detects a monotonic trend', () => {
    const mk = mannKendall([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])!
    expect(mk.tau).toBe(1)
    expect(mk.p).toBeLessThan(0.001)
    expect(mannKendall([3, 1, 4, 1, 5, 9, 2, 6])!.p).toBeGreaterThan(0.05)
  })
  it('classifies improving / stable trends with polarity', () => {
    const rng = createRng(9)
    const up = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 50 + i * 2 + rng.normal(0, 2) }))
    expect(analyzeTrend(up, 1, createRng(1)).direction).toBe('improving')
    // lower-is-better metric (e.g. RT) going up = declining
    expect(analyzeTrend(up, -1, createRng(1)).direction).toBe('declining')
    const flat = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 50 + rng.normal(0, 5) }))
    expect(analyzeTrend(flat, 1, createRng(1)).direction).toBe('stable')
    expect(analyzeTrend(flat.slice(0, 3), 1, createRng(1)).direction).toBe('insufficient')
  })
  it('lowess smooths noise but follows the shape', () => {
    const xs = Array.from({ length: 30 }, (_, i) => i)
    const ys = xs.map((x) => x + (x % 2 ? 3 : -3))
    const fitted = lowess(xs, ys, 0.5)
    expect(Math.abs(fitted[15]! - 15)).toBeLessThan(1.5)
  })
})

describe('Glicko ability engine', () => {
  it('maps levels and ratings both ways', () => {
    expect(levelToRating(3)).toBe(1500)
    expect(ratingToLevel(levelToRating(4.2))).toBeCloseTo(4.2, 10)
    expect(expectedOutcome(levelToRating(3), 3)).toBeCloseTo(0.5, 10)
  })

  it('targets ~75% expected success', () => {
    const a = { rating: levelToRating(3.5), rd: 60 }
    const d = nextDifficulty(a, 0.75)
    expect(expectedOutcome(a.rating, d)).toBeCloseTo(0.75, 2)
  })

  it('converges to the true ability of a simulated patient', () => {
    const rng = createRng(77)
    const trueRating = levelToRating(3.9)
    let a = initialAbility()
    const rds: number[] = []
    for (let i = 0; i < 40; i++) {
      const d = nextDifficulty(a)
      const p = expectedOutcome(trueRating, d)
      const outcome = Math.min(1, Math.max(0, p + rng.normal(0, 0.08)))
      a = updateAbility(a, d, outcome)
      rds.push(a.rd)
    }
    expect(Math.abs(ratingToLevel(a.rating) - 3.9)).toBeLessThan(0.35)
    expect(rds.at(-1)!).toBeLessThan(rds[0]!)
    const band = abilityAsLevel(a)
    expect(band.lo).toBeLessThan(band.level)
    expect(band.hi).toBeGreaterThan(band.level)
  })
})

describe('3-down/1-up staircase', () => {
  it('converges near 79% correct', () => {
    const rng = createRng(11)
    const sc = new Staircase({ start: 2, min: 1, max: 12 })
    const pCorrect = (v: number) => 1 / (1 + Math.exp(1.5 * (v - 6)))
    let correct = 0
    let n = 0
    for (let i = 0; i < 4000; i++) {
      const ok = rng.next() < pCorrect(sc.value)
      if (i > 200) {
        n++
        if (ok) correct++
      }
      sc.record(ok)
    }
    const rate = correct / n
    expect(rate).toBeGreaterThan(0.74)
    expect(rate).toBeLessThan(0.85)
    expect(sc.threshold()).not.toBeNull()
  })
})
