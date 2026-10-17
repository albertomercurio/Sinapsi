import { z } from 'zod'
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording } from '@/modules/measurement'
import { interpolateLevels } from '@/modules/activities/interpolate'
import type { AgeGroup } from '@/modules/activities/taxonomy'
import type { ScoreResult } from '@/modules/activities/types'
import {
  bestR,
  centerOfCancellation,
  clamp,
  intersectionRate,
  meanInterCancellationDistance,
  median,
  round,
} from '@/modules/scoring'

/** Logical stage size; the player scales it to the screen (SVG viewBox). */
export const STAGE = { width: 1000, height: 640 }

export const configSchema = z.object({
  items: z.number().int().min(10).max(160),
  targetRatio: z.number().min(0.05).max(0.5),
  set: z.enum(['shapes', 'letters', 'similarLetters', 'mirror', 'sea']),
  timeLimitS: z.number().int().min(20).max(600),
})
export type Config = z.infer<typeof configSchema>

/** Target and distractor glyphs; harder sets share more visual features with the target. */
export const SETS: Record<Config['set'], { target: string; distractors: string[] }> = {
  shapes: { target: '★', distractors: ['●', '■', '▲', '◆'] },
  letters: { target: 'A', distractors: ['M', 'K', 'S', 'O', 'T', 'U', 'D'] },
  similarLetters: { target: 'E', distractors: ['F', 'B', 'P', 'L', 'H', 'R'] },
  mirror: { target: 'b', distractors: ['d', 'p', 'q', 'h'] },
  sea: { target: '🐟', distractors: ['🐠', '🐡', '🐙', '🦀', '🐚'] },
}

const LEVELS: Config[] = [
  { items: 30, targetRatio: 0.3, set: 'shapes', timeLimitS: 120 },
  { items: 45, targetRatio: 0.25, set: 'letters', timeLimitS: 120 },
  { items: 60, targetRatio: 0.2, set: 'letters', timeLimitS: 150 },
  { items: 80, targetRatio: 0.2, set: 'similarLetters', timeLimitS: 150 },
  { items: 100, targetRatio: 0.15, set: 'mirror', timeLimitS: 180 },
]

export function configFor(difficulty: number, ageGroup: AgeGroup): Config {
  const c = interpolateLevels(LEVELS, difficulty, ['items', 'timeLimitS'])
  if (ageGroup === 'child') {
    return {
      ...c,
      items: Math.min(c.items, 70),
      set: difficulty < 4 ? 'sea' : c.set,
      timeLimitS: c.timeLimitS + 30,
    }
  }
  if (ageGroup === 'senior') return { ...c, timeLimitS: c.timeLimitS + 30 }
  return c
}

export interface Item {
  x: number
  y: number
  glyph: string
  target: boolean
  rotate: number
}

export interface Instance {
  items: Item[]
  target: string
  radius: number
  ageGroup: AgeGroup
}

/**
 * CALIBRATION — expected seconds per item on the sheet. Finishing in this time
 * with perfect accuracy scores 0.75 (the adaptive target). Initial values, to
 * refine with real data (runs can be re-scored from raw events).
 */
export const EXPECTED_SEC_PER_ITEM: Record<AgeGroup, number> = {
  child: 0.9,
  adult: 0.6,
  senior: 0.8,
}

/** Jittered grid layout, so items never overlap and density is uniform left/right. */
export function generate(rng: Rng, config: Config, ageGroup: AgeGroup = 'adult'): Instance {
  const set = SETS[config.set]
  const aspect = STAGE.width / STAGE.height
  const rows = Math.max(3, Math.round(Math.sqrt(config.items / aspect)))
  const cols = Math.ceil(config.items / rows)
  const cellW = STAGE.width / cols
  const cellH = STAGE.height / rows
  const radius = Math.min(cellW, cellH) * 0.36
  const cells = rng.sample(
    Array.from({ length: rows * cols }, (_, i) => i),
    config.items,
  )
  const nTargets = Math.max(3, Math.round(config.items * config.targetRatio))
  const targetSlots = new Set(rng.sample(cells, nTargets))
  const items = cells.map((cell) => {
    const r = Math.floor(cell / cols)
    const c = cell % cols
    const jx = (rng.next() - 0.5) * (cellW - 2 * radius) * 0.8
    const jy = (rng.next() - 0.5) * (cellH - 2 * radius) * 0.8
    const isTarget = targetSlots.has(cell)
    return {
      x: Math.round(c * cellW + cellW / 2 + jx),
      y: Math.round(r * cellH + cellH / 2 + jy),
      glyph: isTarget ? set.target : rng.pick(set.distractors),
      target: isTarget,
      rotate: config.set === 'shapes' || config.set === 'sea' ? rng.int(-15, 15) : 0,
    }
  })
  return { items, target: set.target, radius: Math.round(radius), ageGroup }
}

/**
 * The whole task is one trial; every tap is a response whose target is the
 * item index. A second tap on a marked item un-marks it (self-correction).
 */
export function score(instance: Instance, rec: RunRecording, _config: Config): ScoreResult {
  const trial = rec.trials[0]
  const marked = new Map<number, number>() // item → time of the (last) mark
  const order: number[] = []
  let selfCorrections = 0
  const holds: number[] = []
  for (const r of trial?.responses ?? []) {
    const i = Number(r.target)
    if (!Number.isInteger(i) || !instance.items[i]) continue
    if (typeof r.holdMs === 'number') holds.push(r.holdMs)
    if (marked.has(i)) {
      marked.delete(i)
      selfCorrections++
      const k = order.lastIndexOf(i)
      if (k >= 0) order.splice(k, 1)
    } else {
      marked.set(i, r.t)
      order.push(i)
    }
  }

  const targets = instance.items.map((it, i) => ({ ...it, i })).filter((it) => it.target)
  const distractors = instance.items.length - targets.length
  const hits = targets.filter((t) => marked.has(t.i)).length
  const commissions = [...marked.keys()].filter((i) => !instance.items[i]!.target).length
  const omissions = targets.length - hits
  const hitRate = targets.length ? hits / targets.length : 0
  const faRate = distractors ? commissions / distractors : 0

  const coc = centerOfCancellation(
    targets,
    targets.map((t) => marked.has(t.i)),
  )
  const leftOmissions = targets.filter((t) => !marked.has(t.i) && t.x < STAGE.width / 2).length
  const rightOmissions = omissions - leftOmissions
  const path = order.filter((i) => instance.items[i]!.target).map((i) => instance.items[i]!)
  const diag = Math.hypot(STAGE.width, STAGE.height)
  const times = order.map((i) => marked.get(i)!).sort((a, b) => a - b)
  const intervals = times.slice(1).map((t, k) => t - times[k]!)
  const activeMs = times.length ? times.at(-1)! - (trial?.onset ?? 0) : rec.durationMs
  const durationS = rec.durationMs / 1000
  const firstX = path[0] ? round((2 * path[0].x) / STAGE.width - 1, 3) : null

  const expectedS = instance.items.length * EXPECTED_SEC_PER_ITEM[instance.ageGroup ?? 'adult']
  const speed = 0.5 + 0.5 * clamp(1 - durationS / (2 * expectedS), 0, 1)
  const accuracy = clamp(hitRate - 2 * faRate, 0, 1)
  const performance = clamp(accuracy * speed, 0, 1)

  return {
    score: round(performance * 100, 1)!,
    performance: round(performance, 4)!,
    metrics: {
      targets: targets.length,
      hits,
      omissions,
      commissions,
      hitRate: round(hitRate, 4),
      cancellationsPerMin: activeMs > 0 ? round((hits / activeMs) * 60000, 1) : null,
      cocX: round(coc.x, 3),
      cocY: round(coc.y, 3),
      leftOmissions,
      rightOmissions,
      bestR: round(bestR(path), 3),
      intersectionRate: round(intersectionRate(path), 3),
      meanDistance: round(meanInterCancellationDistance(path, diag), 3),
      firstMarkX: firstX,
      medianInterval: round(median(intervals), 0),
      selfCorrections,
      durationS: round(durationS, 1),
      holdMedian: round(median(holds), 0),
    },
  }
}
