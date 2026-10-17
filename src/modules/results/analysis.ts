import type { ActivityRun } from '@/shared/api/types'
import { getActivity } from '@/modules/activities/registry'
import { DOMAIN_GROUPS, groupOf, type DomainGroupId } from '@/modules/activities/taxonomy'
import type { MetricDescriptor } from '@/modules/activities/types'
import {
  RATING_PER_LEVEL,
  analyzeTrend,
  bootstrapCI,
  lowess,
  mean,
  ratingToLevel,
  type TrendResult,
} from '@/modules/scoring'
import { createRng, hashSeed } from '@/shared/lib/rng'

/**
 * Pure analysis behind the results pages. Everything compares a patient only
 * with their own history (no norms, no diagnostic labels).
 */

export interface RunFilter {
  sinceDays: number | null
  input: string | null
  excludeFlagged: boolean
}

/** Flags that make a run unreliable for trends (still visible in the run list). */
export const EXCLUDING_FLAGS = ['interrupted', 'many_anticipations', 'incomplete', 'few_trials']

export function filterRuns(
  runs: readonly ActivityRun[],
  f: RunFilter,
  now = new Date(),
): ActivityRun[] {
  const since = f.sinceDays ? now.getTime() - f.sinceDays * 86_400_000 : -Infinity
  return runs.filter((r) => {
    if (new Date(r.started_at).getTime() < since) return false
    if (f.input && (r.device as { input?: string })?.input !== f.input) return false
    if (f.excludeFlagged && r.quality_flags.some((q) => EXCLUDING_FLAGS.includes(q))) return false
    return true
  })
}

const DAY = 86_400_000

export interface AbilityPoint {
  t: number
  level: number
  lo: number
  hi: number
  difficulty: number
  score: number | null
  runId: string
}

/** Ability (in level units) after each run, with its 95% interval. */
export function abilitySeries(runs: readonly ActivityRun[], activityId: string): AbilityPoint[] {
  return runs
    .filter((r) => r.activity_id === activityId && r.rating_after !== null)
    .map((r) => {
      const level = ratingToLevel(Number(r.rating_after))
      const half = (1.96 * Number(r.rd_after ?? 350)) / RATING_PER_LEVEL
      return {
        t: new Date(r.started_at).getTime(),
        level,
        lo: level - half,
        hi: level + half,
        difficulty: Number(r.difficulty),
        score: r.score === null ? null : Number(r.score),
        runId: r.id,
      }
    })
    .sort((a, b) => a.t - b.t)
}

export interface MetricPoint {
  t: number
  y: number
  runId: string
}

export function metricSeries(
  runs: readonly ActivityRun[],
  activityId: string,
  key: string,
): MetricPoint[] {
  return runs
    .filter((r) => r.activity_id === activityId)
    .map((r) => {
      const raw = key === 'score' ? r.score : (r.metrics as Record<string, unknown>)?.[key]
      return {
        t: new Date(r.started_at).getTime(),
        y: typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN,
        runId: r.id,
      }
    })
    .filter((p) => Number.isFinite(p.y))
    .sort((a, b) => a.t - b.t)
}

export interface MetricAnalysis {
  points: MetricPoint[]
  smooth: { t: number; y: number }[]
  trend: TrendResult
  /** Recent block (last 3 runs) minus baseline block (first 3 runs), with a bootstrap 95% CI. */
  change: { diff: number; lo: number; hi: number } | null
}

export function analyzeMetric(
  points: MetricPoint[],
  polarity: 1 | -1 | 0,
  seedLabel: string,
): MetricAnalysis {
  const rng = createRng(hashSeed(seedLabel))
  const t0 = points[0]?.t ?? 0
  const xy = points.map((p) => ({ x: (p.t - t0) / DAY, y: p.y }))
  const trend: TrendResult =
    polarity === 0
      ? { ...analyzeTrend(xy, 1, rng), direction: xy.length >= 5 ? 'stable' : 'insufficient' }
      : analyzeTrend(xy, polarity, rng)
  const smooth =
    points.length >= 5
      ? lowess(
          xy.map((p) => p.x),
          xy.map((p) => p.y),
          0.6,
        ).map((y, i) => ({ t: points[i]!.t, y }))
      : []
  return {
    points,
    smooth,
    trend,
    change: baselineChange(
      points.map((p) => p.y),
      rng,
    ),
  }
}

export function baselineChange(values: readonly number[], rng = createRng(1), block = 3) {
  if (values.length < block * 2) return null
  const base = values.slice(0, block)
  const recent = values.slice(-block)
  const diff = mean(recent)! - mean(base)!
  const tagged = [...base.map((v) => ({ g: 0, v })), ...recent.map((v) => ({ g: 1, v }))]
  const ci = bootstrapCI(
    tagged,
    (s) => {
      const a = s.filter((x) => x.g === 0).map((x) => x.v)
      const b = s.filter((x) => x.g === 1).map((x) => x.v)
      return a.length && b.length ? mean(b)! - mean(a)! : null
    },
    rng,
    { b: 800 },
  )
  return ci ? { diff, lo: ci.lo, hi: ci.hi } : null
}

/** Activities a patient has played, with their primary metric descriptors. */
export function playedActivities(runs: readonly ActivityRun[]) {
  const ids = [...new Set(runs.map((r) => r.activity_id))]
  return ids
    .map((id) => getActivity(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({
      activity: a,
      primary: a.metrics.filter((m) => m.primary) as MetricDescriptor[],
    }))
}

/** Fixed categorical slot per domain group: colour follows the entity, never its rank. */
export const DOMAIN_SLOT: Partial<Record<DomainGroupId, number>> = {
  attention: 0,
  memory: 1,
  executive: 2,
  speed: 3,
  visuospatial: 4,
  language: 5,
  orientation: 6,
  calculation: 7,
}

function abilityAt(runs: readonly ActivityRun[], activityId: string, at: number): number | null {
  let level: number | null = null
  for (const r of runs) {
    if (r.activity_id !== activityId || r.rating_after === null) continue
    if (new Date(r.started_at).getTime() <= at) level = ratingToLevel(Number(r.rating_after))
  }
  return level
}

/**
 * Domain composites: for each domain group and week, the mean change in ability
 * (levels) since each activity's first run. Ability (not raw accuracy) is used
 * because adaptive difficulty keeps raw accuracy near the target by design.
 */
export function domainComposites(runs: readonly ActivityRun[]) {
  const sorted = [...runs].sort((a, b) => a.started_at.localeCompare(b.started_at))
  if (!sorted.length) return []
  const first = new Map<string, number>()
  for (const r of sorted) {
    if (r.rating_after !== null && !first.has(r.activity_id))
      first.set(r.activity_id, ratingToLevel(Number(r.rating_after)))
  }
  const start = startOfWeek(new Date(sorted[0]!.started_at)).getTime()
  const end = new Date(sorted.at(-1)!.started_at).getTime()
  const weeks: number[] = []
  for (let w = start; w <= end + 7 * DAY; w += 7 * DAY) weeks.push(w)
  const groups = new Map<DomainGroupId, Set<string>>()
  for (const id of first.keys()) {
    const act = getActivity(id)
    if (!act) continue
    for (const g of new Set(act.domains.map(groupOf)))
      groups.set(g, (groups.get(g) ?? new Set()).add(id))
  }
  return DOMAIN_GROUPS.filter((g) => groups.has(g.id)).map((g) => ({
    group: g.id,
    points: weeks
      .map((w) => {
        const deltas = [...groups.get(g.id)!]
          .map((id) => {
            const at = abilityAt(sorted, id, w + 7 * DAY - 1)
            return at === null ? null : at - first.get(id)!
          })
          .filter((v): v is number => v !== null)
        return deltas.length ? { t: w, y: mean(deltas)! } : null
      })
      .filter((p): p is { t: number; y: number } => p !== null),
  }))
}

/** Ability per domain group at two dates (dumbbell "profile" comparison). */
export function domainProfile(runs: readonly ActivityRun[], from: number, to: number) {
  const ids = [...new Set(runs.map((r) => r.activity_id))]
  const rows = new Map<DomainGroupId, { a: number[]; b: number[] }>()
  for (const id of ids) {
    const act = getActivity(id)
    if (!act) continue
    const a = abilityAt(runs, id, from) ?? firstAbility(runs, id)
    const b = abilityAt(runs, id, to)
    if (a === null || b === null) continue
    for (const g of new Set(act.domains.map(groupOf))) {
      const row = rows.get(g) ?? { a: [], b: [] }
      row.a.push(a)
      row.b.push(b)
      rows.set(g, row)
    }
  }
  return DOMAIN_GROUPS.filter((g) => rows.has(g.id)).map((g) => ({
    group: g.id,
    from: mean(rows.get(g.id)!.a)!,
    to: mean(rows.get(g.id)!.b)!,
  }))
}

function firstAbility(runs: readonly ActivityRun[], id: string): number | null {
  const r = runs.find((x) => x.activity_id === id && x.rating_after !== null)
  return r ? ratingToLevel(Number(r.rating_after)) : null
}

/** Runs per calendar day (local date) for the activity heatmap. */
export function runsPerDay(runs: readonly ActivityRun[]): [string, number, number][] {
  const map = new Map<string, { n: number; ms: number }>()
  for (const r of runs) {
    const d = new Date(r.started_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const cur = map.get(key) ?? { n: 0, ms: 0 }
    cur.n++
    cur.ms += r.duration_ms
    map.set(key, cur)
  }
  return [...map.entries()].map(([k, v]) => [k, v.n, Math.round(v.ms / 60000)])
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setDate(x.getDate() - day)
  return x
}

export function summaryStats(runs: readonly ActivityRun[]) {
  const sessions = new Set(runs.map((r) => r.session_id).filter(Boolean))
  const minutes = Math.round(runs.reduce((s, r) => s + r.duration_ms, 0) / 60000)
  const last = runs.reduce<string | null>(
    (m, r) => (!m || r.started_at > m ? r.started_at : m),
    null,
  )
  const days = new Set(runsPerDay(runs).map((d) => d[0]))
  return { runs: runs.length, sessions: sessions.size, minutes, last, activeDays: days.size }
}
