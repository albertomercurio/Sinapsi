import { clamp, zScore } from './stats'

/**
 * Integrated speed–accuracy measures. They summarize performance in one
 * number when patients trade speed for accuracy (or vice versa).
 */

/** Inverse efficiency score (Townsend & Ashby, 1983): mean correct RT / proportion correct. Lower = better. */
export function inverseEfficiency(
  meanCorrectRtMs: number | null,
  propCorrect: number,
): number | null {
  if (meanCorrectRtMs === null || propCorrect <= 0) return null
  return meanCorrectRtMs / propCorrect
}

/** Rate-correct score (Woltz & Was, 2006): correct responses per second of responding. Higher = better. */
export function rateCorrect(nCorrect: number, totalRtMs: number): number | null {
  if (totalRtMs <= 0) return null
  return nCorrect / (totalRtMs / 1000)
}

/**
 * Balanced integration score (Liesefeld & Janczyk, 2019): z(PC) − z(RT).
 * The reference distribution is the patient's own history (never population norms).
 */
export function balancedIntegration(
  propCorrect: number,
  meanRtMs: number,
  ref: { pcMean: number; pcSd: number; rtMean: number; rtSd: number },
): number | null {
  const zpc = zScore(propCorrect, ref.pcMean, ref.pcSd)
  const zrt = zScore(meanRtMs, ref.rtMean, ref.rtSd)
  if (zpc === null || zrt === null) return null
  return zpc - zrt
}

/**
 * Signed residual time ("high speed, high stakes") scoring rule of Maris & van
 * der Maas (2012), used by Math Garden: each item scores (2x − 1)(1 − t/d),
 * so fast correct answers earn most and fast wrong answers cost most.
 * Omissions (no response before the deadline) score 0. Returns the mean in
 * [−1, 1] and its rescaling to [0, 1].
 */
export function signedResidualTime(
  items: readonly { correct: boolean; rtMs: number | null }[],
  deadlineMs: number,
): { mean: number; normalized: number } | null {
  if (!items.length || deadlineMs <= 0) return null
  let s = 0
  for (const it of items) {
    if (it.rtMs === null) continue
    const remaining = 1 - clamp(it.rtMs / deadlineMs, 0, 1)
    s += (it.correct ? 1 : -1) * remaining
  }
  const m = s / items.length
  return { mean: m, normalized: (m + 1) / 2 }
}
