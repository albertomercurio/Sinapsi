import { z } from 'zod'
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording } from '@/modules/measurement'
import { interpolateLevels } from '@/modules/activities/interpolate'
import type { AgeGroup } from '@/modules/activities/taxonomy'
import type { ScoreResult } from '@/modules/activities/types'
import { clamp, median, round } from '@/modules/scoring'

export const configSchema = z.object({
  modality: z.enum(['spatial', 'digits']),
  direction: z.enum(['forward', 'backward']),
  startLength: z.number().int().min(2).max(9),
  minLength: z.number().int().min(2).max(9),
  maxLength: z.number().int().min(3).max(10),
  trials: z.number().int().min(4).max(24),
  presentationMs: z.number().int().min(300).max(2500),
  isiMs: z.number().int().min(100).max(1500),
  gridSize: z.union([z.literal(9), z.literal(16)]),
})
export type Config = z.infer<typeof configSchema>

/** Item difficulty on the 1–5 scale for a sequence length (2 → 1, 7 → 5). */
export function lengthToDifficulty(length: number, direction: Config['direction']): number {
  const effective = length + (direction === 'backward' ? 1 : 0)
  return clamp(1 + (effective - 2) * 0.8, 1, 5)
}

const LEVELS: Omit<Config, 'modality' | 'direction'>[] = [
  {
    startLength: 2,
    minLength: 2,
    maxLength: 5,
    trials: 8,
    presentationMs: 1100,
    isiMs: 500,
    gridSize: 9,
  },
  {
    startLength: 3,
    minLength: 2,
    maxLength: 6,
    trials: 10,
    presentationMs: 950,
    isiMs: 400,
    gridSize: 9,
  },
  {
    startLength: 4,
    minLength: 2,
    maxLength: 7,
    trials: 12,
    presentationMs: 850,
    isiMs: 350,
    gridSize: 9,
  },
  {
    startLength: 5,
    minLength: 3,
    maxLength: 8,
    trials: 12,
    presentationMs: 750,
    isiMs: 300,
    gridSize: 16,
  },
  {
    startLength: 6,
    minLength: 3,
    maxLength: 9,
    trials: 14,
    presentationMs: 650,
    isiMs: 250,
    gridSize: 16,
  },
]

export function configFor(difficulty: number, ageGroup: AgeGroup): Config {
  const c = interpolateLevels(
    LEVELS,
    difficulty,
    ['startLength', 'minLength', 'maxLength', 'trials', 'presentationMs', 'isiMs'],
    ['gridSize'],
  )
  const base: Config = {
    ...c,
    modality: 'spatial',
    direction: 'forward',
    gridSize: c.gridSize as 9 | 16,
  }
  if (ageGroup === 'child')
    return { ...base, gridSize: 9, presentationMs: base.presentationMs + 150 }
  if (ageGroup === 'senior') return { ...base, presentationMs: base.presentationMs + 100 }
  return base
}

export interface Instance {
  /** Pre-generated candidate sequences for every possible length (the staircase picks one per trial). */
  pools: Record<number, number[][]>
}

/** Sequences without immediate repetitions; spatial ones also avoid revisiting a tile. */
export function generate(rng: Rng, config: Config): Instance {
  const pools: Record<number, number[][]> = {}
  const alphabet = config.modality === 'spatial' ? config.gridSize : 10
  for (let len = config.minLength; len <= config.maxLength; len++) {
    pools[len] = Array.from({ length: config.trials }, () => {
      if (config.modality === 'spatial')
        return rng.sample(
          Array.from({ length: alphabet }, (_, i) => i),
          len,
        )
      const seq: number[] = []
      while (seq.length < len) {
        const d = rng.int(0, 9)
        if (d !== seq.at(-1)) seq.push(d)
      }
      return seq
    })
  }
  return { pools }
}

export function expectedAnswer(seq: readonly number[], direction: Config['direction']): number[] {
  return direction === 'backward' ? [...seq].reverse() : [...seq]
}

/**
 * trial.stimulus = { seq: number[], length }; responses carry the chosen
 * tile/digit as `target`. Partial-credit unit scoring (Conway et al., 2005):
 * proportion of items recalled in the correct serial position, averaged over
 * trials. Item errors = elements not in the list; order errors = right
 * element, wrong position.
 */
export function score(_instance: Instance, rec: RunRecording, config: Config): ScoreResult {
  const trials = rec.trials.filter((t) => Array.isArray((t.stimulus as { seq?: number[] })?.seq))
  let pcuSum = 0
  let itemErrors = 0
  let orderErrors = 0
  let maxSpan = 0
  let correctTrials = 0
  const posHits: number[] = []
  const posTotals: number[] = []
  const latencies: number[] = []
  const interTap: number[] = []
  const holds: number[] = []
  const items: { difficulty: number; outcome: number }[] = []

  for (const tr of trials) {
    const seq = (tr.stimulus as { seq: number[] }).seq
    const answer = expectedAnswer(seq, config.direction)
    const given = tr.responses.map((r) => Number(r.target))
    let inPlace = 0
    answer.forEach((v, k) => {
      posTotals[k] = (posTotals[k] ?? 0) + 1
      if (given[k] === v) {
        inPlace++
        posHits[k] = (posHits[k] ?? 0) + 1
      } else if (given[k] !== undefined) {
        if (answer.includes(given[k]!)) orderErrors++
        else itemErrors++
      }
    })
    const pcu = inPlace / answer.length
    pcuSum += pcu
    const ok = inPlace === answer.length
    if (ok) {
      correctTrials++
      maxSpan = Math.max(maxSpan, answer.length)
    }
    // The ability engine uses all-or-nothing per sequence (as in adaptive span testing);
    // partial credit is kept for the displayed score.
    items.push({
      difficulty: lengthToDifficulty(answer.length, config.direction),
      outcome: ok ? 1 : 0,
    })
    const goAt = Number((tr.extra as { goAt?: number } | undefined)?.goAt ?? NaN)
    if (tr.responses[0] && Number.isFinite(goAt)) latencies.push(tr.responses[0].t - goAt)
    tr.responses.forEach((r, k) => {
      if (k > 0) interTap.push(r.t - tr.responses[k - 1]!.t)
      if (typeof r.holdMs === 'number') holds.push(r.holdMs)
    })
  }

  const n = trials.length || 1
  const pcu = pcuSum / n
  const lengths = trials.map((t) => (t.stimulus as { seq: number[] }).seq.length)
  const last = lengths.slice(-4)
  const threshold = last.length ? last.reduce((a, b) => a + b, 0) / last.length : null
  const lastPos = posTotals.length - 1

  return {
    score: round(pcu * 100, 1)!,
    performance: round(pcu, 4)!,
    items,
    metrics: {
      pcuScore: round(pcu, 4),
      maxSpan,
      spanEstimate: round(threshold, 2),
      correctTrials,
      itemErrors,
      orderErrors,
      firstPositionAccuracy: posTotals[0] ? round((posHits[0] ?? 0) / posTotals[0], 3) : null,
      lastPositionAccuracy:
        lastPos > 0 && posTotals[lastPos]
          ? round((posHits[lastPos] ?? 0) / posTotals[lastPos]!, 3)
          : null,
      responseLatency: round(median(latencies), 0),
      interTapMedian: round(median(interTap), 0),
      holdMedian: round(median(holds), 0),
      backward: config.direction === 'backward' ? 1 : 0,
      digits: config.modality === 'digits' ? 1 : 0,
    },
  }
}
