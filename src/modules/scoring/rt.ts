import { finite, mad, mean, median, quantile, sd } from './stats'

export interface RtSummary {
  n: number
  mean: number | null
  median: number | null
  sd: number | null
  /** Coefficient of variation (SD / mean): intra-individual variability. */
  cv: number | null
  mad: number | null
  iqr: number | null
  min: number | null
  max: number | null
  /** Responses faster than the anticipation threshold (default 150 ms). */
  anticipations: number
  /** Responses slower than median + k·MAD (default k = 3). */
  slowOutliers: number
  /** Same statistics after removing anticipations and slow outliers. */
  trimmed: {
    n: number
    mean: number | null
    median: number | null
    sd: number | null
    cv: number | null
  }
}

export interface RtOptions {
  anticipationMs?: number
  madK?: number
}

export function summarizeRt(
  values: readonly (number | null | undefined)[],
  opts: RtOptions = {},
): RtSummary {
  const anticipationMs = opts.anticipationMs ?? 150
  const k = opts.madK ?? 3
  const rts = finite(values)
  const m = mean(rts)
  const s = sd(rts)

  const valid = rts.filter((x) => x >= anticipationMs)
  const med = median(valid)
  const spread = mad(valid)
  const upper = med !== null && spread !== null && spread > 0 ? med + k * spread : Infinity
  const kept = valid.filter((x) => x <= upper)
  const tm = mean(kept)
  const ts = sd(kept)
  const q1 = quantile(rts, 0.25)
  const q3 = quantile(rts, 0.75)

  return {
    n: rts.length,
    mean: m,
    median: median(rts),
    sd: s,
    cv: m && s !== null ? s / m : null,
    mad: mad(rts),
    iqr: q1 !== null && q3 !== null ? q3 - q1 : null,
    min: rts.length ? Math.min(...rts) : null,
    max: rts.length ? Math.max(...rts) : null,
    anticipations: rts.length - valid.length,
    slowOutliers: valid.length - kept.length,
    trimmed: {
      n: kept.length,
      mean: tm,
      median: median(kept),
      sd: ts,
      cv: tm && ts !== null ? ts / tm : null,
    },
  }
}
