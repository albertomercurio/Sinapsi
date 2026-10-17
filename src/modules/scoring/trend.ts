import type { Rng } from '@/shared/lib/rng'
import { normCdf } from './normal'
import { median, quantile } from './stats'

/** Theil–Sen estimator: median of pairwise slopes. Robust to ~29% outliers. */
export function theilSen(
  xs: readonly number[],
  ys: readonly number[],
): { slope: number; intercept: number } {
  const n = Math.min(xs.length, ys.length)
  const slopes: number[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = xs[j]! - xs[i]!
      if (dx !== 0) slopes.push((ys[j]! - ys[i]!) / dx)
    }
  }
  const slope = median(slopes) ?? 0
  const intercept = median(ys.slice(0, n).map((y, i) => y - slope * xs[i]!)) ?? 0
  return { slope, intercept }
}

/**
 * Mann–Kendall monotonic trend test with tie correction. Values must be in
 * time order. Returns Kendall's τ, the normal-approximation z and two-sided p.
 */
export function mannKendall(
  ys: readonly number[],
): { s: number; tau: number; z: number; p: number } | null {
  const n = ys.length
  if (n < 4) return null
  let s = 0
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) s += Math.sign(ys[j]! - ys[i]!)
  }
  const ties = new Map<number, number>()
  for (const y of ys) ties.set(y, (ties.get(y) ?? 0) + 1)
  let tieTerm = 0
  for (const t of ties.values()) if (t > 1) tieTerm += t * (t - 1) * (2 * t + 5)
  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18
  const z =
    varS > 0 ? (s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0) : 0
  const p = 2 * (1 - normCdf(Math.abs(z)))
  return { s, tau: s / ((n * (n - 1)) / 2), z, p }
}

/** Percentile bootstrap confidence interval for any statistic of paired data. */
export function bootstrapCI<T>(
  data: readonly T[],
  stat: (sample: readonly T[]) => number | null,
  rng: Rng,
  opts: { b?: number; level?: number } = {},
): { lo: number; hi: number } | null {
  const b = opts.b ?? 1000
  const level = opts.level ?? 0.95
  if (data.length < 3) return null
  const values: number[] = []
  for (let k = 0; k < b; k++) {
    const sample = Array.from(
      { length: data.length },
      () => data[Math.floor(rng.next() * data.length)]!,
    )
    const v = stat(sample)
    if (v !== null && Number.isFinite(v)) values.push(v)
  }
  if (values.length < b * 0.5) return null
  const alpha = (1 - level) / 2
  return { lo: quantile(values, alpha)!, hi: quantile(values, 1 - alpha)! }
}

/** Exponentially weighted moving average. */
export function ewma(values: readonly number[], alpha = 0.3): number[] {
  const out: number[] = []
  let s: number | null = null
  for (const v of values) {
    s = s === null ? v : alpha * v + (1 - alpha) * s
    out.push(s)
  }
  return out
}

/**
 * LOWESS (Cleveland, 1979): local linear regression with tricube weights and
 * bisquare robustness iterations. Returns fitted values at each x.
 */
export function lowess(
  xs: readonly number[],
  ys: readonly number[],
  frac = 0.6,
  iterations = 2,
): number[] {
  const n = xs.length
  if (n < 3) return ys.slice()
  const r = Math.max(2, Math.ceil(frac * n))
  const robust: number[] = Array.from({ length: n }, () => 1)
  let fitted: number[] = Array.from({ length: n }, () => 0)
  for (let it = 0; it <= iterations; it++) {
    fitted = xs.map((x0) => {
      const dists = xs.map((x) => Math.abs(x - x0))
      const h = [...dists].sort((a, b) => a - b)[r - 1] || 1e-12
      let sw = 0
      let swx = 0
      let swy = 0
      let swxx = 0
      let swxy = 0
      for (let i = 0; i < n; i++) {
        const u = dists[i]! / h
        const w = (u < 1 ? (1 - u ** 3) ** 3 : 0) * robust[i]!
        sw += w
        swx += w * xs[i]!
        swy += w * ys[i]!
        swxx += w * xs[i]! * xs[i]!
        swxy += w * xs[i]! * ys[i]!
      }
      if (sw === 0) return ys[xs.indexOf(x0)]!
      const denom = sw * swxx - swx * swx
      if (Math.abs(denom) < 1e-12) return swy / sw
      const b = (sw * swxy - swx * swy) / denom
      const a = (swy - b * swx) / sw
      return a + b * x0
    })
    if (it === iterations) break
    const resid = ys.map((y, i) => Math.abs(y - fitted[i]!))
    const s = median(resid) ?? 0
    if (s === 0) break
    for (let i = 0; i < n; i++) {
      const u = resid[i]! / (6 * s)
      robust[i] = u < 1 ? (1 - u * u) ** 2 : 0
    }
  }
  return fitted
}

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'insufficient'

export interface TrendResult {
  n: number
  slope: number | null
  intercept: number | null
  ci: { lo: number; hi: number } | null
  mannKendall: ReturnType<typeof mannKendall>
  direction: TrendDirection
}

/**
 * Descriptive trend of one metric over time, compared only with the patient's
 * own history. `polarity` = +1 if higher is better, −1 if lower is better.
 * A direction is reported only when the bootstrap CI of the Theil–Sen slope
 * excludes zero AND the Mann–Kendall test agrees (p < 0.05).
 */
export function analyzeTrend(
  points: readonly { x: number; y: number }[],
  polarity: 1 | -1,
  rng: Rng,
  minN = 5,
): TrendResult {
  const n = points.length
  if (n < minN) {
    return {
      n,
      slope: null,
      intercept: null,
      ci: null,
      mannKendall: null,
      direction: 'insufficient',
    }
  }
  const sorted = [...points].sort((a, b) => a.x - b.x)
  const xs = sorted.map((p) => p.x)
  const ys = sorted.map((p) => p.y)
  const fit = theilSen(xs, ys)
  const ci = bootstrapCI(
    sorted,
    (s) => {
      const distinct = new Set(s.map((p) => p.x)).size
      return distinct >= 3
        ? theilSen(
            s.map((p) => p.x),
            s.map((p) => p.y),
          ).slope
        : null
    },
    rng,
    { b: 600 },
  )
  const mk = mannKendall(ys)
  let direction: TrendDirection = 'stable'
  if (ci && mk && mk.p < 0.05 && (ci.lo > 0 || ci.hi < 0)) {
    direction = Math.sign(fit.slope) * polarity > 0 ? 'improving' : 'declining'
  }
  return { n, slope: fit.slope, intercept: fit.intercept, ci, mannKendall: mk, direction }
}
