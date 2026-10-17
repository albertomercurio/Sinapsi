import { probit } from './normal'

export interface SdtCounts {
  hits: number
  misses: number
  falseAlarms: number
  correctRejections: number
}

export interface SdtResult {
  hitRate: number | null
  falseAlarmRate: number | null
  /** Sensitivity d′ = z(H) − z(F), log-linear corrected. */
  dPrime: number | null
  /** Response bias c = −(z(H) + z(F)) / 2. Positive = conservative. */
  criterion: number | null
  /** Non-parametric sensitivity A′ (Grier 1971), on uncorrected rates. */
  aPrime: number | null
}

/**
 * Signal-detection measures with the log-linear correction (Hautus, 1995):
 * add 0.5 to every cell, so rates of 0 or 1 never produce infinite z-scores.
 */
export function signalDetection(c: SdtCounts): SdtResult {
  const signal = c.hits + c.misses
  const noise = c.falseAlarms + c.correctRejections
  const H = signal > 0 ? c.hits / signal : null
  const F = noise > 0 ? c.falseAlarms / noise : null

  let dPrime: number | null = null
  let criterion: number | null = null
  if (signal > 0 && noise > 0) {
    const hc = (c.hits + 0.5) / (signal + 1)
    const fc = (c.falseAlarms + 0.5) / (noise + 1)
    const zh = probit(hc)
    const zf = probit(fc)
    dPrime = zh - zf
    criterion = -(zh + zf) / 2
  }

  let aPrime: number | null = null
  if (H !== null && F !== null) {
    if (H === F) aPrime = 0.5
    else if (H > F) aPrime = 0.5 + ((H - F) * (1 + H - F)) / (4 * H * (1 - F))
    else aPrime = 0.5 - ((F - H) * (1 + F - H)) / (4 * F * (1 - H))
    if (!Number.isFinite(aPrime)) aPrime = null
  }

  return { hitRate: H, falseAlarmRate: F, dPrime, criterion, aPrime }
}
