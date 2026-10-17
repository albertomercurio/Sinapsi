import { z } from 'zod'
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording, TrialRecord } from '@/modules/measurement'
import { interpolateLevels } from '@/modules/activities/interpolate'
import type { AgeGroup } from '@/modules/activities/taxonomy'
import type { ScoreResult } from '@/modules/activities/types'
import { clamp, finite, mean, median, round } from '@/modules/scoring'

export const STAGE = { width: 1000, height: 640 }

export const configSchema = z.object({
  nodes: z.number().int().min(4).max(26),
  parts: z.enum(['A', 'AB']),
  radius: z.number().int().min(18).max(60),
})
export type Config = z.infer<typeof configSchema>

const LEVELS: Config[] = [
  { nodes: 8, parts: 'A', radius: 46 },
  { nodes: 12, parts: 'A', radius: 42 },
  { nodes: 10, parts: 'AB', radius: 40 },
  { nodes: 14, parts: 'AB', radius: 36 },
  { nodes: 20, parts: 'AB', radius: 32 },
]

export function configFor(difficulty: number, ageGroup: AgeGroup): Config {
  const c = interpolateLevels(LEVELS, difficulty, ['nodes', 'radius'])
  if (ageGroup === 'child') return { ...c, nodes: Math.min(c.nodes, 12), radius: c.radius + 4 }
  if (ageGroup === 'senior') return { ...c, radius: c.radius + 4 }
  return c
}

/**
 * CALIBRATION — expected time per link (ms). A link at this speed scores 0.75
 * (the adaptive target): the signed-residual-time deadline is twice this value.
 * Initial values, to refine with real data (runs can be re-scored from raw events).
 */
const EXPECTED_LINK_MS: Record<AgeGroup, { A: number; B: number }> = {
  child: { A: 2000, B: 3000 },
  adult: { A: 1200, B: 1800 },
  senior: { A: 1800, B: 2800 },
}

export interface Node {
  label: string
  x: number
  y: number
}

export interface Part {
  id: 'A' | 'B'
  nodes: Node[]
}

export interface Instance {
  parts: Part[]
  radius: number
  ageGroup: AgeGroup
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function labelsFor(part: 'A' | 'B', n: number): string[] {
  if (part === 'A') return Array.from({ length: n }, (_, i) => String(i + 1))
  return Array.from({ length: n }, (_, i) =>
    i % 2 === 0 ? String(i / 2 + 1) : LETTERS[(i - 1) / 2]!,
  )
}

/** Random layout with a minimum distance between nodes (rejection sampling). */
export function layout(rng: Rng, n: number, radius: number): { x: number; y: number }[] {
  const margin = radius + 8
  for (let minDist = radius * 3.2; minDist > radius * 2.1; minDist *= 0.92) {
    const pts: { x: number; y: number }[] = []
    let tries = 0
    while (pts.length < n && tries < 5000) {
      tries++
      const p = {
        x: rng.float(margin, STAGE.width - margin),
        y: rng.float(margin, STAGE.height - margin),
      }
      if (pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= minDist)) pts.push(p)
    }
    if (pts.length === n) return pts.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  }
  throw new Error('layout failed')
}

export function generate(rng: Rng, config: Config, ageGroup: AgeGroup): Instance {
  const ids: ('A' | 'B')[] = config.parts === 'AB' ? ['A', 'B'] : ['A']
  return {
    radius: config.radius,
    ageGroup,
    parts: ids.map((id) => {
      const labels = labelsFor(id, config.nodes)
      const pts = layout(rng.fork(id), config.nodes, config.radius)
      return { id, nodes: labels.map((label, i) => ({ label, ...pts[i]! })) }
    }),
  }
}

interface PartStats {
  links: number[]
  timeMs: number | null
  errors: number
  medianLinkMs: number | null
  pauses: number
  pathEfficiency: number | null
}

/**
 * One trial per part. Each tap is a response whose target is the node index;
 * a correct tap is the next node in sequence, any other node is an error (the
 * patient continues from the last correct node).
 */
export function partStats(tr: TrialRecord | undefined): PartStats {
  if (!tr)
    return {
      links: [],
      timeMs: null,
      errors: 0,
      medianLinkMs: null,
      pauses: 0,
      pathEfficiency: null,
    }
  let expected = 1 // node 0 is pre-connected (start)
  let errors = 0
  let lastCorrectT = tr.onset ?? 0
  const links: number[] = []
  const eff: number[] = []
  for (const r of tr.responses) {
    const target = Number(r.target)
    if (target === 0 && expected === 1) continue
    if (target === expected) {
      links.push(r.t - lastCorrectT)
      lastCorrectT = r.t
      if (r.movement?.efficiency != null && r.input !== 'touch') eff.push(r.movement.efficiency)
      expected++
    } else if (target !== expected - 1) {
      errors++
    }
  }
  const med = median(links)
  const pauses = med ? links.filter((l) => l > 2.5 * med).length : 0
  const complete = (tr.extra as { complete?: boolean } | undefined)?.complete !== false
  return {
    links,
    timeMs: complete && tr.onset !== null ? lastCorrectT - tr.onset : null,
    errors,
    medianLinkMs: med,
    pauses,
    pathEfficiency: eff.length ? mean(eff) : null,
  }
}

export function score(instance: Instance, rec: RunRecording): ScoreResult {
  const stats = instance.parts.map((p, i) => ({
    id: p.id,
    n: p.nodes.length,
    s: partStats(rec.trials[i]),
  }))
  const exp = EXPECTED_LINK_MS[instance.ageGroup]
  // Signed residual time per link (Maris & van der Maas, 2012): each correct link
  // scores 1 − t/d, each wrong tap −0.5; missing links (gave up) score 0.
  const perf = stats.map(({ id, n, s }) => {
    const deadline = 2 * exp[id]
    const sum =
      s.links.reduce((acc, t) => acc + (1 - clamp(t / deadline, 0, 1)), 0) - 0.5 * s.errors
    return (clamp(sum / Math.max(1, n - 1), -1, 1) + 1) / 2
  })
  const performance = mean(perf) ?? 0
  const a = stats.find((x) => x.id === 'A')?.s
  const b = stats.find((x) => x.id === 'B')?.s
  const holds = finite(rec.trials.flatMap((t) => t.responses.map((r) => r.holdMs)))

  return {
    score: round(performance * 100, 1)!,
    performance: round(performance, 4)!,
    metrics: {
      timeA: a?.timeMs != null ? round(a.timeMs / 1000, 2) : null,
      timeB: b?.timeMs != null ? round(b.timeMs / 1000, 2) : null,
      errorsA: a?.errors ?? null,
      errorsB: b?.errors ?? null,
      bMinusA:
        a?.timeMs != null && b?.timeMs != null ? round((b.timeMs - a.timeMs) / 1000, 2) : null,
      bOverA: a?.timeMs && b?.timeMs != null ? round(b.timeMs / a.timeMs, 3) : null,
      medianLinkA: round(a?.medianLinkMs, 0),
      medianLinkB: round(b?.medianLinkMs, 0),
      pauses: (a?.pauses ?? 0) + (b?.pauses ?? 0),
      pathEfficiency: round(mean(finite([a?.pathEfficiency, b?.pathEfficiency])), 3),
      holdMedian: round(median(holds), 0),
    },
    flags: stats.some((x) => x.s.timeMs === null) ? ['incomplete'] : [],
  }
}
