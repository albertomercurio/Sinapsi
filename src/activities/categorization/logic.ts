import { z } from 'zod'
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording } from '@/modules/measurement'
import type { ContentPack, Stimulus, StimulusCategory } from '@/content'
import { interpolateLevels } from '@/modules/activities/interpolate'
import type { AgeGroup } from '@/modules/activities/taxonomy'
import type { ScoreResult } from '@/modules/activities/types'
import { median, round, signedResidualTime, summarizeRt } from '@/modules/scoring'

export const configSchema = z.object({
  bins: z.number().int().min(2).max(4),
  items: z.number().int().min(6).max(60),
  /** 'switch' alternates between sorting by category and by size, with a visible cue. */
  rule: z.enum(['category', 'switch']),
  switchEvery: z.number().int().min(3).max(20),
  responseWindowMs: z.number().int().min(1500).max(15000),
  showWord: z.boolean(),
  feedback: z.boolean(),
})
export type Config = z.infer<typeof configSchema>

const LEVELS: Config[] = [
  {
    bins: 2,
    items: 12,
    rule: 'category',
    switchEvery: 8,
    responseWindowMs: 9000,
    showWord: true,
    feedback: true,
  },
  {
    bins: 3,
    items: 16,
    rule: 'category',
    switchEvery: 8,
    responseWindowMs: 7000,
    showWord: true,
    feedback: true,
  },
  {
    bins: 4,
    items: 20,
    rule: 'category',
    switchEvery: 8,
    responseWindowMs: 5000,
    showWord: true,
    feedback: true,
  },
  {
    bins: 2,
    items: 24,
    rule: 'switch',
    switchEvery: 8,
    responseWindowMs: 5000,
    showWord: true,
    feedback: false,
  },
  {
    bins: 2,
    items: 30,
    rule: 'switch',
    switchEvery: 5,
    responseWindowMs: 3500,
    showWord: true,
    feedback: false,
  },
]

export function configFor(difficulty: number, ageGroup: AgeGroup): Config {
  const c = interpolateLevels(LEVELS, difficulty, [
    'bins',
    'items',
    'switchEvery',
    'responseWindowMs',
  ])
  if (ageGroup === 'child')
    return {
      ...c,
      items: Math.round(c.items * 0.8),
      responseWindowMs: c.responseWindowMs + 2000,
      feedback: true,
    }
  if (ageGroup === 'senior') return { ...c, responseWindowMs: c.responseWindowMs + 1500 }
  return c
}

export type Rule = 'category' | 'size'

export interface Bin {
  key: string
  label: string
  emoji: string
}

export interface Item {
  stimulus: Pick<Stimulus, 'id' | 'emoji' | 'category' | 'size'>
  word: string
  rule: Rule
  /** Correct bin index under the active rule. */
  answer: number
  /** Correct bin index under the other rule (for perseverative errors), null without switching. */
  otherAnswer: number | null
  switchTrial: boolean
}

export interface Instance {
  categoryBins: Bin[]
  sizeBins: Bin[]
  items: Item[]
}

export function generate(
  rng: Rng,
  config: Config,
  content: ContentPack,
  ageGroup: AgeGroup,
): Instance {
  const pool = content.stimuli.filter((s) => ageGroup !== 'child' || s.kid)
  const byCat = new Map<StimulusCategory, Stimulus[]>()
  for (const s of pool) byCat.set(s.category, [...(byCat.get(s.category) ?? []), s])

  const bins = config.rule === 'switch' ? 2 : config.bins
  // For switching we need categories that contain both big and small items.
  const eligible = [...byCat.entries()].filter(([, list]) =>
    config.rule === 'switch'
      ? list.filter((s) => s.size === 'big').length >= 3 &&
        list.filter((s) => s.size === 'small').length >= 3
      : list.length >= 4,
  )
  const cats = rng.sample(eligible, bins).map(([c]) => c)
  const categoryBins: Bin[] = cats.map((c) => ({
    key: c,
    label: content.category(c),
    emoji: content.categoryEmoji[c],
  }))
  const sizeBins: Bin[] = [
    { key: 'big', label: content.attribute('big'), emoji: '🐘' },
    { key: 'small', label: content.attribute('small'), emoji: '🐜' },
  ]

  const candidates = rng.shuffle(cats.flatMap((c) => byCat.get(c)!))
  const items: Item[] = []
  let rule: Rule = 'category'
  for (let k = 0; k < config.items; k++) {
    const switchTrial = config.rule === 'switch' && k > 0 && k % config.switchEvery === 0
    if (switchTrial) rule = rule === 'category' ? 'size' : 'category'
    // Balanced bins: cycle through bins, avoiding the same stimulus twice in a row.
    const wantBin = k % bins
    const pickFrom = candidates.filter((s) =>
      rule === 'category'
        ? s.category === cats[wantBin]
        : s.size === (wantBin === 0 ? 'big' : 'small'),
    )
    let s = rng.pick(pickFrom.length ? pickFrom : candidates)
    if (items.at(-1)?.stimulus.id === s.id && pickFrom.length > 1)
      s = rng.pick(pickFrom.filter((x) => x.id !== s.id))
    const catAnswer = cats.indexOf(s.category)
    const sizeAnswer = s.size === 'big' ? 0 : 1
    items.push({
      stimulus: { id: s.id, emoji: s.emoji, category: s.category, size: s.size },
      word: content.word(s.id),
      rule,
      answer: rule === 'category' ? catAnswer : sizeAnswer,
      otherAnswer: config.rule === 'switch' ? (rule === 'category' ? sizeAnswer : catAnswer) : null,
      switchTrial,
    })
  }
  // Shuffle order within each rule block so bins are not predictable.
  const blocks: Item[][] = []
  for (const it of items) {
    if (!blocks.length || it.switchTrial) blocks.push([])
    blocks.at(-1)!.push(it)
  }
  const ordered = blocks.flatMap((b) => {
    const [first, ...rest] = b
    return first!.switchTrial ? [first!, ...rng.shuffle(rest)] : rng.shuffle(b)
  })
  return { categoryBins, sizeBins, items: ordered }
}

/** trial.stimulus = { k } (item index); response.target = bin index. */
export function score(instance: Instance, rec: RunRecording, config: Config): ScoreResult {
  const trials = rec.trials.slice(0, instance.items.length)
  let correct = 0
  let perseverative = 0
  let timeouts = 0
  const rtsAll: number[] = []
  const rtsSwitch: number[] = []
  const rtsRepeat: number[] = []
  let switchCorrect = 0
  let switchN = 0
  let repeatCorrect = 0
  let repeatN = 0
  const holds: number[] = []
  const srtItems: { correct: boolean; rtMs: number | null }[] = []

  trials.forEach((tr, k) => {
    const item = instance.items[k]!
    const resp = tr.responses[0]
    const rt =
      resp && tr.rt !== null && tr.rt !== undefined && tr.rt <= config.responseWindowMs
        ? tr.rt
        : null
    const choice = resp ? Number(resp.target) : null
    const ok = rt !== null && choice === item.answer
    if (rt === null) timeouts++
    if (ok) correct++
    if (
      !ok &&
      choice !== null &&
      item.otherAnswer !== null &&
      choice === item.otherAnswer &&
      item.otherAnswer !== item.answer
    ) {
      perseverative++
    }
    if (rt !== null && ok) {
      rtsAll.push(rt)
      ;(item.switchTrial ? rtsSwitch : rtsRepeat).push(rt)
    }
    if (item.switchTrial) {
      switchN++
      if (ok) switchCorrect++
    } else {
      repeatN++
      if (ok) repeatCorrect++
    }
    if (typeof resp?.holdMs === 'number') holds.push(resp.holdMs)
    srtItems.push({ correct: ok, rtMs: rt })
  })

  const n = trials.length || 1
  const rt = summarizeRt(rtsAll)
  const srt = signedResidualTime(srtItems, config.responseWindowMs)
  const performance = srt ? srt.normalized : correct / n
  const ms = median(rtsSwitch)
  const mr = median(rtsRepeat)

  return {
    score: round(performance * 100, 1)!,
    performance: round(performance, 4)!,
    metrics: {
      accuracy: round(correct / n, 4),
      errors: n - correct - timeouts,
      timeouts,
      perseverativeErrors: perseverative,
      medianRt: round(rt.trimmed.median, 0),
      rtCv: round(rt.trimmed.cv, 3),
      switchCostRt: ms !== null && mr !== null ? round(ms - mr, 0) : null,
      switchCostAccuracy:
        switchN && repeatN ? round(repeatCorrect / repeatN - switchCorrect / switchN, 3) : null,
      holdMedian: round(median(holds), 0),
    },
  }
}
