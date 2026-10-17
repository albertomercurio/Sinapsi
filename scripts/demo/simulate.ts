/**
 * Simulated patients for LOCAL DEMO DATA ONLY. Each simulator turns a latent
 * ability (level units) into a plausible RunRecording for one activity, so the
 * real scoring, ability engine and charts can be exercised end to end.
 */
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording, TrialRecord } from '@/modules/measurement'
import type { Instance as GngInstance, Config as GngConfig } from '@/activities/go-no-go/logic'
import type { Instance as PairsInstance } from '@/activities/memory-pairs/logic'
import type {
  Instance as CancelInstance,
  Config as CancelConfig,
} from '@/activities/cancellation/logic'
import {
  expectedAnswer,
  type Instance as SpanInstance,
  type Config as SpanConfig,
} from '@/activities/span-sequence/logic'
import type {
  Instance as CatInstance,
  Config as CatConfig,
} from '@/activities/categorization/logic'
import type { Instance as TrailInstance } from '@/activities/trail-connect/logic'
import { Staircase } from '@/modules/scoring'

const device = {
  input: 'mouse' as const,
  coarsePointer: false,
  screenW: 1440,
  screenH: 900,
  viewportW: 1440,
  viewportH: 820,
  dpr: 2,
  refreshHz: 60,
}

/** Probability of success when ability exceeds difficulty by `gap` levels. */
const p = (gap: number, slope = 1.4) => 1 / (1 + Math.exp(-slope * gap))

function recording(
  trials: TrialRecord[],
  durationMs: number,
  start: Date,
  baseline?: number,
): RunRecording {
  return {
    startedAt: start.toISOString(),
    durationMs: Math.round(durationMs),
    trials,
    samples: [],
    interruptions: [],
    device,
    stage: { width: 1200, height: 760 },
    baseline: baseline ? { median: baseline, rts: [baseline] } : undefined,
  }
}

const hold = (rng: Rng) => Math.round(rng.normal(115, 25))

export function simGoNoGo(
  rng: Rng,
  inst: GngInstance,
  cfg: GngConfig,
  ability: number,
  difficulty: number,
  start: Date,
) {
  const gap = ability - difficulty
  let t = 0
  const motor = 240 + rng.normal(0, 15)
  const trials = inst.trials.map((tr, i): TrialRecord => {
    t += tr.isiMs
    const onset = t
    t += cfg.responseWindowMs
    const rt = Math.max(
      160,
      motor +
        160 -
        40 * gap +
        rng.normal(0, 45) +
        rng.exponential(90 - 15 * Math.max(-2, Math.min(2, gap))),
    )
    const responds =
      tr.kind === 'go'
        ? rng.next() < 0.97 && rt < cfg.responseWindowMs
        : rng.next() < 0.45 * (1 - p(gap))
    return {
      i,
      stimulus: { kind: tr.kind },
      onset,
      rt: responds ? Math.round(Math.min(rt, cfg.responseWindowMs - 1)) : null,
      responses: responds ? [{ t: onset + rt, input: 'mouse', holdMs: hold(rng) }] : [],
    }
  })
  return recording(trials, t, start, Math.round(motor))
}

export function simPairs(
  rng: Rng,
  inst: PairsInstance,
  ability: number,
  difficulty: number,
  start: Date,
) {
  const memory = p(ability - difficulty, 1.2)
  const known = new Map<string, number[]>()
  const done = new Set<number>()
  const trials: TrialRecord[] = []
  let t = 0
  while (done.size < inst.cards.length && trials.length < 120) {
    const hidden = inst.cards.filter((c) => !done.has(c.index))
    const remembered = hidden.find(
      (c) => (known.get(c.stimulus.id) ?? []).filter((i) => !done.has(i)).length >= 2,
    )
    const a = remembered && rng.next() < memory ? remembered : rng.pick(hidden)
    const partner = (known.get(a.stimulus.id) ?? []).find((i) => i !== a.index && !done.has(i))
    const b =
      partner !== undefined && rng.next() < memory
        ? inst.cards[partner]!
        : rng.pick(hidden.filter((c) => c.index !== a.index))
    for (const c of [a, b])
      known.set(c.stimulus.id, [...new Set([...(known.get(c.stimulus.id) ?? []), c.index])])
    if (a.stimulus.id === b.stimulus.id) {
      done.add(a.index)
      done.add(b.index)
    }
    const gapMs = Math.round(rng.normal(1100 - 120 * (ability - difficulty), 200))
    trials.push({
      i: trials.length,
      stimulus: { kind: 'attempt' },
      onset: t,
      responses: [
        { t, input: 'mouse', target: a.index, holdMs: hold(rng) },
        { t: t + Math.max(300, gapMs), input: 'mouse', target: b.index, holdMs: hold(rng) },
      ],
    })
    t += Math.max(1200, gapMs + 1300)
  }
  return recording(trials, t, start)
}

export function simCancellation(
  rng: Rng,
  inst: CancelInstance,
  cfg: CancelConfig,
  ability: number,
  difficulty: number,
  start: Date,
) {
  const gap = ability - difficulty
  const hitP = 0.75 + 0.24 * p(gap)
  const order = inst.items
    .map((it, i) => ({ ...it, i }))
    .sort(
      (a, b) =>
        Math.round(a.y / 90) - Math.round(b.y / 90) ||
        a.x - b.x + rng.normal(0, 140 * (1 - p(gap))),
    )
  const responses = []
  let t = 800
  const pace = Math.max(0.4, 1 - 0.18 * gap) // matched ability ≈ expected time per item
  for (const it of order) {
    t += rng.normal(450, 80) * pace
    if (it.target ? rng.next() < hitP : rng.next() < 0.03 * (1 - p(gap))) {
      t += rng.normal(750, 150) * pace
      responses.push({ t: Math.round(t), input: 'mouse' as const, target: it.i, holdMs: hold(rng) })
    }
  }
  return recording(
    [{ i: 0, stimulus: { kind: 'search' }, onset: 0, responses }],
    Math.min(t + 1500, cfg.timeLimitS * 1000),
    start,
  )
}

export function simSpan(
  rng: Rng,
  inst: SpanInstance,
  cfg: SpanConfig,
  ability: number,
  start: Date,
) {
  const capacity = 2 + (ability - 1) / 0.8 // span the patient handles at ~50%
  const sc = new Staircase({
    start: cfg.startLength,
    min: cfg.minLength,
    max: cfg.maxLength,
    down: 3,
    up: 1,
  })
  const trials: TrialRecord[] = []
  let t = 0
  for (let k = 0; k < cfg.trials; k++) {
    const len = sc.value
    const seq = inst.pools[len]![k]!
    const answer = expectedAnswer(seq, cfg.direction)
    const ok = rng.next() < p(capacity - len, 1.6)
    const given = [...answer]
    if (!ok) {
      const j = rng.int(0, given.length - 1)
      if (rng.bool() && given.length > 1) {
        const j2 = (j + 1) % given.length
        ;[given[j], given[j2]] = [given[j2]!, given[j]!]
      } else given[j] = (given[j]! + 1) % (cfg.modality === 'spatial' ? cfg.gridSize : 10)
    }
    t += len * (cfg.presentationMs + cfg.isiMs) + 700
    const goAt = t
    const responses = given.map((v, i) => ({
      t: goAt + 900 + i * rng.normal(650, 90),
      input: 'mouse' as const,
      target: v,
      holdMs: hold(rng),
    }))
    trials.push({
      i: k,
      stimulus: { seq, length: len },
      onset: goAt,
      extra: { goAt },
      responses,
      correct: ok,
    })
    t = responses.at(-1)!.t + 900
    sc.record(ok)
  }
  return recording(trials, t, start)
}

export function simCategorization(
  rng: Rng,
  inst: CatInstance,
  cfg: CatConfig,
  ability: number,
  difficulty: number,
  start: Date,
) {
  const gap = ability - difficulty
  let t = 0
  const trials = inst.items.map((it, k): TrialRecord => {
    t += it.switchTrial ? 1200 : 450
    const onset = t
    const rt = Math.max(
      350,
      1100 - 150 * gap + rng.normal(0, 180) + rng.exponential(200) + (it.switchTrial ? 350 : 0),
    )
    const ok = rng.next() < 0.7 + 0.28 * p(gap) - (it.switchTrial ? 0.15 : 0)
    const bins = it.rule === 'size' ? 2 : inst.categoryBins.length
    const choice = ok
      ? it.answer
      : it.otherAnswer !== null && rng.bool(0.6)
        ? it.otherAnswer
        : (it.answer + 1) % bins
    t += Math.min(rt, cfg.responseWindowMs) + 300
    return rt < cfg.responseWindowMs
      ? {
          i: k,
          stimulus: { k },
          onset,
          rt: Math.round(rt),
          responses: [{ t: onset + rt, input: 'mouse', target: choice, holdMs: hold(rng) }],
        }
      : { i: k, stimulus: { k }, onset, rt: null, responses: [] }
  })
  return recording(trials, t, start)
}

export function simTrail(
  rng: Rng,
  inst: TrailInstance,
  ability: number,
  difficulty: number,
  start: Date,
) {
  const gap = ability - difficulty
  let t = 0
  const trials = inst.parts.map((part, pi): TrialRecord => {
    t += 1500
    const onset = t
    const responses = []
    for (let i = 1; i < part.nodes.length; i++) {
      const base = part.id === 'A' ? 1200 : 1800 // expected link times at matched ability
      t += Math.max(
        350,
        base * Math.max(0.4, 1 - 0.18 * gap) + rng.normal(0, 200) + (rng.next() < 0.06 ? 2000 : 0),
      )
      if (rng.next() < 0.06 * (1 - p(gap)) * (part.id === 'B' ? 2 : 1)) {
        responses.push({
          t: Math.round(t),
          input: 'mouse' as const,
          target: (i + 2) % part.nodes.length,
          holdMs: hold(rng),
        })
        t += 700
      }
      responses.push({ t: Math.round(t), input: 'mouse' as const, target: i, holdMs: hold(rng) })
    }
    return { i: pi, stimulus: { part: part.id }, onset, responses, extra: { complete: true } }
  })
  return recording(trials, t, start)
}
