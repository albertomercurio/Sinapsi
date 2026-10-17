import { finite, mean } from './stats'
import { theilSen } from './trend'

export interface SequentialTrial {
  correct: boolean
  rt: number | null
  /** Onset time (ms from run start), for time-on-task analyses. */
  t?: number
}

/**
 * Robust post-error slowing (Dutilh et al., 2012): for every error flanked by
 * correct trials, RT(error + 1) − RT(error − 1). Immune to global drifts in speed.
 */
export function postErrorSlowing(trials: readonly SequentialTrial[]): {
  pes: number | null
  n: number
} {
  const diffs: number[] = []
  for (let i = 1; i < trials.length - 1; i++) {
    const prev = trials[i - 1]!
    const cur = trials[i]!
    const next = trials[i + 1]!
    if (!cur.correct && prev.correct && next.correct && prev.rt !== null && next.rt !== null) {
      diffs.push(next.rt - prev.rt)
    }
  }
  return { pes: mean(diffs), n: diffs.length }
}

/** P(correct | previous error) − P(correct | previous correct). */
export function postErrorAccuracy(trials: readonly SequentialTrial[]): number | null {
  let afterErr = 0
  let afterErrOk = 0
  let afterOk = 0
  let afterOkOk = 0
  for (let i = 1; i < trials.length; i++) {
    if (trials[i - 1]!.correct) {
      afterOk++
      if (trials[i]!.correct) afterOkOk++
    } else {
      afterErr++
      if (trials[i]!.correct) afterErrOk++
    }
  }
  if (!afterErr || !afterOk) return null
  return afterErrOk / afterErr - afterOkOk / afterOk
}

/**
 * Vigilance decrement: robust (Theil–Sen) slope of RT and accuracy over time on
 * task, per minute. Positive RT slope = slowing down.
 */
export function vigilanceDecrement(trials: readonly SequentialTrial[]): {
  rtSlopePerMin: number | null
  accuracySlopePerMin: number | null
} {
  const timed = trials.filter((t) => typeof t.t === 'number')
  const rtPts = timed.filter((t) => t.rt !== null && t.correct)
  const rt =
    rtPts.length >= 8
      ? theilSen(
          rtPts.map((t) => t.t! / 60000),
          rtPts.map((t) => t.rt!),
        )
      : null

  // Accuracy over blocks of ~10 trials.
  let accuracySlopePerMin: number | null = null
  if (timed.length >= 20) {
    const size = Math.max(5, Math.floor(timed.length / 6))
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i + size <= timed.length; i += size) {
      const block = timed.slice(i, i + size)
      xs.push(mean(block.map((b) => b.t! / 60000))!)
      ys.push(block.filter((b) => b.correct).length / block.length)
    }
    accuracySlopePerMin = xs.length >= 3 ? theilSen(xs, ys).slope : null
  }
  return { rtSlopePerMin: rt?.slope ?? null, accuracySlopePerMin }
}

/** Ratio of the mean of the last third to the mean of the first third. */
export function fatigueIndex(values: readonly (number | null)[]): number | null {
  const xs = finite(values)
  if (xs.length < 9) return null
  const third = Math.floor(xs.length / 3)
  const first = mean(xs.slice(0, third))
  const last = mean(xs.slice(xs.length - third))
  if (first === null || last === null || first === 0) return null
  return last / first
}
