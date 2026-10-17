import { describe, expect, it } from 'vitest'
import { createRng } from '@/shared/lib/rng'
import { buildContentPack } from '@/content'
import words from '@/content/it/words.json'
import type { RunRecording, TrialRecord } from '@/modules/measurement'
import { configFor, generate, score } from './logic'

const content = buildContentPack('it', words as never)
const device = {
  input: 'touch',
  coarsePointer: true,
  screenW: 1,
  screenH: 1,
  viewportW: 1,
  viewportH: 1,
  dpr: 1,
  refreshHz: 60,
} as const

/** Simulates a player with perfect (memory = true) or no memory. */
function play(seed: number, memory: boolean) {
  const config = configFor(3, 'adult')
  const inst = generate(createRng(seed), config, content, 'adult')
  const rng = createRng(seed + 7)
  const known = new Map<string, number>()
  const done = new Set<number>()
  const trials: TrialRecord[] = []
  let t = 0
  while (done.size < inst.cards.length && trials.length < 200) {
    const hidden = inst.cards.filter((c) => !done.has(c.index))
    const a = memory
      ? (hidden.find((c) => known.has(c.stimulus.id) && known.get(c.stimulus.id) !== c.index) ??
        rng.pick(hidden))
      : rng.pick(hidden)
    let b =
      memory && known.has(a.stimulus.id) && known.get(a.stimulus.id) !== a.index
        ? inst.cards[known.get(a.stimulus.id)!]!
        : rng.pick(hidden.filter((c) => c.index !== a.index))
    if (memory && !known.has(a.stimulus.id)) {
      const match = hidden.find(
        (c) =>
          c.index !== a.index &&
          c.stimulus.id === a.stimulus.id &&
          known.get(c.stimulus.id) === c.index,
      )
      if (match) b = match
    }
    for (const c of [a, b]) if (!known.has(c.stimulus.id)) known.set(c.stimulus.id, c.index)
    if (a.stimulus.id === b.stimulus.id) {
      done.add(a.index)
      done.add(b.index)
    } else if (memory) {
      known.set(b.stimulus.id, b.index)
    }
    trials.push({
      i: trials.length,
      stimulus: null,
      onset: t,
      responses: [
        { t, input: 'touch', target: a.index, holdMs: 90 },
        { t: t + 900, input: 'touch', target: b.index, holdMs: 90 },
      ],
    })
    t += 2000
  }
  const rec: RunRecording = {
    startedAt: '',
    durationMs: t,
    trials,
    samples: [],
    interruptions: [],
    device,
    stage: { width: 0, height: 0 },
  }
  return score(inst, rec)
}

describe('memory-pairs', () => {
  it('generates pairs: every stimulus exactly twice', () => {
    const config = configFor(4, 'adult')
    const inst = generate(createRng(3), config, content, 'adult')
    expect(inst.cards).toHaveLength(config.pairs * 2)
    const counts = new Map<string, number>()
    for (const c of inst.cards) counts.set(c.stimulus.id, (counts.get(c.stimulus.id) ?? 0) + 1)
    expect([...counts.values()].every((v) => v === 2)).toBe(true)
  })

  it('uses only child-friendly stimuli for children', () => {
    const inst = generate(createRng(4), configFor(5, 'child'), content, 'child')
    const kid = new Set(content.stimuli.filter((s) => s.kid).map((s) => s.id))
    expect(inst.cards.every((c) => kid.has(c.stimulus.id))).toBe(true)
  })

  it('rewards memory: fewer attempts, fewer memory errors, higher score', () => {
    const good = play(10, true)
    const random = play(10, false)
    expect(good.metrics.attempts!).toBeLessThan(random.metrics.attempts!)
    expect(good.metrics.memoryErrors!).toBeLessThanOrEqual(random.metrics.memoryErrors!)
    expect(good.score).toBeGreaterThan(random.score)
  })
})
