/** Descriptive statistics used across the scoring engine (all pure, NaN-safe). */

export function finite(values: readonly (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

export function sum(xs: readonly number[]): number {
  let s = 0
  for (const x of xs) s += x
  return s
}

export function mean(xs: readonly number[]): number | null {
  return xs.length ? sum(xs) / xs.length : null
}

export function variance(xs: readonly number[]): number | null {
  if (xs.length < 2) return null
  const m = sum(xs) / xs.length
  let s = 0
  for (const x of xs) s += (x - m) ** 2
  return s / (xs.length - 1)
}

export function sd(xs: readonly number[]): number | null {
  const v = variance(xs)
  return v === null ? null : Math.sqrt(v)
}

/** Linear-interpolated quantile (type 7, like R's default). */
export function quantile(xs: readonly number[], q: number): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo)
}

export function median(xs: readonly number[]): number | null {
  return quantile(xs, 0.5)
}

/** Median absolute deviation, scaled (×1.4826) to estimate SD under normality. */
export function mad(xs: readonly number[]): number | null {
  const m = median(xs)
  if (m === null) return null
  return 1.4826 * (median(xs.map((x) => Math.abs(x - m))) ?? 0)
}

export function skewness(xs: readonly number[]): number | null {
  const n = xs.length
  if (n < 3) return null
  const m = sum(xs) / n
  let m2 = 0
  let m3 = 0
  for (const x of xs) {
    const d = x - m
    m2 += d * d
    m3 += d * d * d
  }
  m2 /= n
  m3 /= n
  if (m2 === 0) return 0
  return m3 / m2 ** 1.5
}

export function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const mx = sum(xs.slice(0, n)) / n
  const my = sum(ys.slice(0, n)) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx
    const dy = ys[i]! - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return 0
  return sxy / Math.sqrt(sxx * syy)
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

export function round(x: number | null | undefined, digits = 2): number | null {
  if (x === null || x === undefined || !Number.isFinite(x)) return null
  const f = 10 ** digits
  return Math.round(x * f) / f
}

export function zScore(x: number, m: number, s: number): number | null {
  return s > 0 ? (x - m) / s : null
}
