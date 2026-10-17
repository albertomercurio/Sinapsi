import { z } from 'zod'
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording } from '@/modules/measurement'
import type { ContentPack, Stimulus } from '@/content'
import { interpolateLevels } from '@/modules/activities/interpolate'
import type { AgeGroup } from '@/modules/activities/taxonomy'
import type { ScoreResult } from '@/modules/activities/types'
import { clamp, median, round } from '@/modules/scoring'

export const configSchema = z.object({
  pairs: z.number().int().min(2).max(15),
  previewMs: z.number().int().min(0).max(10000),
  /** 0 = stimuli from different categories, 1 = all from the same category (harder). */
  similarity: z.number().min(0).max(1),
  flipBackMs: z.number().int().min(300).max(3000),
  showWords: z.boolean(),
})
export type Config = z.infer<typeof configSchema>

const LEVELS: Config[] = [
  { pairs: 3, previewMs: 3000, similarity: 0, flipBackMs: 1300, showWords: false },
  { pairs: 4, previewMs: 2000, similarity: 0.2, flipBackMs: 1100, showWords: false },
  { pairs: 6, previewMs: 1000, similarity: 0.4, flipBackMs: 1000, showWords: false },
  { pairs: 8, previewMs: 0, similarity: 0.7, flipBackMs: 900, showWords: false },
  { pairs: 10, previewMs: 0, similarity: 1, flipBackMs: 800, showWords: false },
]

export function configFor(difficulty: number, ageGroup: AgeGroup): Config {
  const c = interpolateLevels(LEVELS, difficulty, ['pairs', 'previewMs', 'flipBackMs'])
  if (ageGroup === 'child')
    return { ...c, pairs: Math.min(c.pairs, 8), flipBackMs: c.flipBackMs + 200 }
  return c
}

export interface Card {
  index: number
  stimulus: Pick<Stimulus, 'id' | 'emoji'> & { word: string }
}

export interface Instance {
  cards: Card[]
  columns: number
}

export function generate(
  rng: Rng,
  config: Config,
  content: ContentPack,
  ageGroup: AgeGroup,
): Instance {
  const pool = content.stimuli.filter((s) => ageGroup !== 'child' || s.kid)
  const nSame = Math.round(config.pairs * config.similarity)
  const byCategory = new Map<string, Stimulus[]>()
  for (const s of pool) byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s])
  const bigCategories = [...byCategory.entries()].filter(([, list]) => list.length >= config.pairs)
  const main = rng.pick(bigCategories.length ? bigCategories : [...byCategory.entries()])[1]
  const chosen = rng.sample(main, nSame)
  const rest = rng.shuffle(
    pool.filter((s) => !chosen.includes(s) && s.category !== main[0]!.category),
  )
  // Different categories for the remaining pairs: round-robin across categories.
  const seen = new Set<string>()
  for (const s of rest) {
    if (chosen.length >= config.pairs) break
    if (seen.has(s.category) && seen.size < byCategory.size - 1) continue
    seen.add(s.category)
    chosen.push(s)
  }
  for (const s of rest) {
    if (chosen.length >= config.pairs) break
    if (!chosen.includes(s)) chosen.push(s)
  }
  const deck = rng.shuffle(chosen.flatMap((s) => [s, s]))
  const n = deck.length
  const columns = n <= 6 ? 3 : n <= 8 ? 4 : n <= 12 ? 4 : n <= 16 ? 4 : n <= 20 ? 5 : 6
  return {
    columns,
    cards: deck.map((s, index) => ({
      index,
      stimulus: { id: s.id, emoji: s.emoji, word: content.word(s.id) },
    })),
  }
}

/**
 * Expected number of attempts for a player with PERFECT memory under optimal
 * play: ≈ (3 − 2 ln 2)·n + 7/8 − 2 ln 2 (Velleman & Warrington, 2013). Even
 * perfect memory needs more than n attempts, because unseen cards must be
 * discovered first, so efficiency is measured against this optimum.
 */
export function optimalAttempts(pairs: number): number {
  return Math.max(pairs, (3 - 2 * Math.LN2) * pairs + 7 / 8 - 2 * Math.LN2)
}

/** One trial = one attempt (two flips). responses[k].target = card index. */
export function score(instance: Instance, rec: RunRecording): ScoreResult {
  const pairs = instance.cards.length / 2
  const attempts = rec.trials.filter((t) => t.responses.length >= 2)
  const seenAt = new Map<number, number>() // card index → attempt where it was first revealed
  const triedPairs = new Set<string>()
  let matched = 0
  let knownErrors = 0
  let perseverations = 0
  const flipIntervals: number[] = []
  const holds: number[] = []

  attempts.forEach((tr, k) => {
    const [a, b] = [tr.responses[0]!, tr.responses[1]!]
    const ia = Number(a.target)
    const ib = Number(b.target)
    const same = instance.cards[ia]?.stimulus.id === instance.cards[ib]?.stimulus.id
    if (same) {
      matched++
    } else {
      // The partner of the first card had already been revealed: a memory error.
      const partner = instance.cards.findIndex(
        (c, i) => i !== ia && c.stimulus.id === instance.cards[ia]?.stimulus.id,
      )
      if (partner >= 0 && seenAt.has(partner) && partner !== ib) knownErrors++
      const key = [ia, ib].sort((x, y) => x - y).join('-')
      if (triedPairs.has(key)) perseverations++
      triedPairs.add(key)
    }
    if (!seenAt.has(ia)) seenAt.set(ia, k)
    if (!seenAt.has(ib)) seenAt.set(ib, k)
    flipIntervals.push(b.t - a.t)
    for (const r of [a, b]) if (typeof r.holdMs === 'number') holds.push(r.holdMs)
  })

  const n = attempts.length || 1
  const efficiency = matched ? pairs / n : 0
  // 1 = as good as optimal play with perfect memory; 0.5 ≈ twice the optimal attempts.
  const vsOptimal = matched ? clamp(optimalAttempts(pairs) / n, 0, 1) : 0
  const completed = matched >= pairs
  const medianInterval = median(flipIntervals)
  const speed = medianInterval === null ? 0.5 : clamp(1 - (medianInterval - 800) / 4000, 0, 1)
  const performance = clamp(
    (completed ? vsOptimal : vsOptimal * (matched / pairs)) * 0.9 + speed * 0.1,
    0,
    1,
  )
  const durationS = rec.durationMs / 1000

  return {
    score: round(performance * 100, 1)!,
    performance: round(performance, 4)!,
    metrics: {
      pairs,
      matched,
      attempts: attempts.length,
      efficiency: round(efficiency, 4),
      efficiencyVsOptimal: round(vsOptimal, 4),
      memoryErrors: knownErrors,
      perseverations,
      secondsPerPair: matched ? round(durationS / matched, 1) : null,
      medianFlipInterval: round(medianInterval, 0),
      holdMedian: round(median(holds), 0),
    },
    flags: completed ? [] : ['incomplete'],
  }
}
