import { z } from 'zod'
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording } from '@/modules/measurement'
import { interpolateLevels } from '@/modules/activities/interpolate'
import type { AgeGroup } from '@/modules/activities/taxonomy'
import type { ScoreResult } from '@/modules/activities/types'
import {
  fatigueIndex,
  fitExGauss,
  median,
  postErrorSlowing,
  round,
  signalDetection,
  summarizeRt,
  vigilanceDecrement,
} from '@/modules/scoring'

export const configSchema = z.object({
  trials: z.number().int().min(10).max(200),
  goRatio: z.number().min(0.5).max(0.9),
  stimulusMs: z.number().int().min(200).max(3000),
  isiMinMs: z.number().int().min(200).max(4000),
  isiMaxMs: z.number().int().min(200).max(5000),
  responseWindowMs: z.number().int().min(300).max(4000),
  stimulusSet: z.enum(['shapes', 'sea']),
})
export type Config = z.infer<typeof configSchema>

const LEVELS: Config[] = [
  {
    trials: 30,
    goRatio: 0.8,
    stimulusMs: 1500,
    isiMinMs: 1200,
    isiMaxMs: 1800,
    responseWindowMs: 2000,
    stimulusSet: 'shapes',
  },
  {
    trials: 40,
    goRatio: 0.78,
    stimulusMs: 1100,
    isiMinMs: 1000,
    isiMaxMs: 1600,
    responseWindowMs: 1500,
    stimulusSet: 'shapes',
  },
  {
    trials: 50,
    goRatio: 0.75,
    stimulusMs: 800,
    isiMinMs: 900,
    isiMaxMs: 1400,
    responseWindowMs: 1100,
    stimulusSet: 'shapes',
  },
  {
    trials: 60,
    goRatio: 0.72,
    stimulusMs: 600,
    isiMinMs: 700,
    isiMaxMs: 1200,
    responseWindowMs: 900,
    stimulusSet: 'shapes',
  },
  {
    trials: 70,
    goRatio: 0.7,
    stimulusMs: 450,
    isiMinMs: 500,
    isiMaxMs: 1000,
    responseWindowMs: 700,
    stimulusSet: 'shapes',
  },
]

export function configFor(difficulty: number, ageGroup: AgeGroup): Config {
  const c = interpolateLevels(LEVELS, difficulty, [
    'trials',
    'stimulusMs',
    'isiMinMs',
    'isiMaxMs',
    'responseWindowMs',
  ])
  if (ageGroup === 'child') {
    return {
      ...c,
      trials: Math.round(c.trials * 0.8),
      responseWindowMs: Math.round(c.responseWindowMs * 1.2),
      stimulusMs: Math.round(c.stimulusMs * 1.15),
      stimulusSet: 'sea',
    }
  }
  if (ageGroup === 'senior') {
    return {
      ...c,
      responseWindowMs: Math.round(c.responseWindowMs * 1.15),
      stimulusMs: Math.round(c.stimulusMs * 1.1),
    }
  }
  return c
}

export interface Trial {
  kind: 'go' | 'nogo'
  isiMs: number
}

export interface Instance {
  trials: Trial[]
}

/** Exact go/no-go proportion, at most two no-go trials in a row, first two trials always go. */
export function generate(rng: Rng, config: Config): Instance {
  const nGo = Math.round(config.trials * config.goRatio)
  for (let attempt = 0; attempt < 200; attempt++) {
    const kinds = rng.shuffle([
      ...Array<'go'>(nGo).fill('go'),
      ...Array<'nogo'>(config.trials - nGo).fill('nogo'),
    ])
    const ok =
      kinds[0] === 'go' &&
      kinds[1] === 'go' &&
      kinds.every((k, i) => !(k === 'nogo' && kinds[i - 1] === 'nogo' && kinds[i - 2] === 'nogo'))
    if (ok || attempt === 199) {
      return {
        trials: kinds.map((kind) => ({ kind, isiMs: rng.int(config.isiMinMs, config.isiMaxMs) })),
      }
    }
  }
  throw new Error('unreachable')
}

export const STIMULI = {
  shapes: { go: '🟢', nogo: '🟥' },
  sea: { go: '🐟', nogo: '🦈' },
} as const

export function score(
  instance: Instance,
  rec: RunRecording,
  config: Config,
  baselineRt: number | null,
): ScoreResult {
  const trials = rec.trials.slice(0, instance.trials.length)
  let hits = 0
  let misses = 0
  let fa = 0
  let cr = 0
  const goRts: number[] = []
  const holds: number[] = []
  let perfSum = 0
  const seq = trials.map((tr, i) => {
    const kind = instance.trials[i]!.kind
    const responded =
      tr.responses.length > 0 &&
      tr.rt !== null &&
      tr.rt !== undefined &&
      tr.rt <= config.responseWindowMs
    const rt = responded ? (tr.rt as number) : null
    if (kind === 'go') {
      if (responded) {
        hits++
        goRts.push(rt!)
        perfSum += 0.5 + 0.5 * Math.max(0, 1 - rt! / config.responseWindowMs)
      } else {
        misses++
      }
    } else if (responded) {
      fa++
    } else {
      cr++
      perfSum += 1
    }
    const hold = tr.responses[0]?.holdMs
    if (typeof hold === 'number') holds.push(hold)
    return { correct: kind === 'go' ? responded : !responded, rt, t: tr.onset ?? undefined }
  })

  const n = trials.length || 1
  const sdt = signalDetection({ hits, misses, falseAlarms: fa, correctRejections: cr })
  const rt = summarizeRt(goRts)
  const exg = fitExGauss(rt.trimmed.n >= 40 ? goRts.filter((x) => x >= 150) : [])
  const pes = postErrorSlowing(seq)
  const vig = vigilanceDecrement(seq)
  const performance = perfSum / n
  const medianHold = median(holds)

  return {
    score: round(performance * 100, 1)!,
    performance: round(performance, 4)!,
    metrics: {
      accuracy: round((hits + cr) / n, 4),
      hits,
      omissions: misses,
      commissions: fa,
      commissionRate: round(sdt.falseAlarmRate, 4),
      dPrime: round(sdt.dPrime, 3),
      criterion: round(sdt.criterion, 3),
      medianRt: round(rt.trimmed.median, 0),
      meanRt: round(rt.trimmed.mean, 0),
      rtCv: round(rt.trimmed.cv, 3),
      exgMu: round(exg?.mu, 0),
      exgSigma: round(exg?.sigma, 0),
      exgTau: round(exg?.tau, 0),
      anticipations: rt.anticipations,
      postErrorSlowing: round(pes.pes, 0),
      vigilanceRtSlope: round(vig.rtSlopePerMin, 1),
      fatigueIndex: round(fatigueIndex(seq.map((s) => s.rt)), 3),
      baselineRt: round(baselineRt, 0),
      decisionTime:
        rt.trimmed.median !== null && baselineRt !== null
          ? round(rt.trimmed.median - baselineRt, 0)
          : null,
      holdMedian: round(medianHold, 0),
    },
  }
}
