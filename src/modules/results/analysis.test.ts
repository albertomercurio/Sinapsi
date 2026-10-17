import { describe, expect, it } from 'vitest'
import type { ActivityRun } from '@/shared/api/types'
import { levelToRating } from '@/modules/scoring'
import {
  abilitySeries,
  analyzeMetric,
  baselineChange,
  domainComposites,
  domainProfile,
  filterRuns,
  metricSeries,
  runsPerDay,
  summaryStats,
} from './analysis'

function run(i: number, over: Partial<ActivityRun> = {}): ActivityRun {
  const started = new Date(Date.UTC(2026, 5, 1 + i * 2, 10)).toISOString()
  return {
    id: `r${i}`,
    org_id: 'o',
    patient_id: 'p',
    session_id: `s${Math.floor(i / 2)}`,
    session_item_id: null,
    activity_id: 'go-no-go',
    activity_version: 1,
    scoring_version: 1,
    difficulty: 2 + i * 0.1,
    seed: i,
    config: {},
    device: { input: 'mouse' },
    mode: 'clinic',
    started_at: started,
    duration_ms: 120000,
    score: 60 + i,
    performance: 0.6,
    metrics: { medianRt: 600 - i * 10, dPrime: 1 + i * 0.1 },
    quality_flags: [],
    rating_before: null,
    rating_after: levelToRating(2 + i * 0.1),
    rd_after: 100,
    created_by: null,
    created_at: started,
    ...over,
  }
}

const runs = Array.from({ length: 12 }, (_, i) => run(i))

describe('results analysis', () => {
  it('builds ability series in level units with a 95% band', () => {
    const s = abilitySeries(runs, 'go-no-go')
    expect(s).toHaveLength(12)
    expect(s[0]!.level).toBeCloseTo(2, 6)
    expect(s[0]!.hi - s[0]!.level).toBeCloseTo((1.96 * 100) / 200, 6)
  })

  it('detects an improving RT trend (lower is better) and a positive change from baseline', () => {
    const pts = metricSeries(runs, 'go-no-go', 'medianRt')
    const a = analyzeMetric(pts, -1, 'test')
    expect(a.trend.direction).toBe('improving')
    expect(a.smooth).toHaveLength(12)
    expect(a.change!.diff).toBeLessThan(0)
    expect(baselineChange([1, 2])).toBeNull()
  })

  it('filters by period, input type and quality flags', () => {
    const mixed = [...runs, run(20, { device: { input: 'touch' }, quality_flags: ['interrupted'] })]
    expect(
      filterRuns(mixed, { sinceDays: null, input: 'touch', excludeFlagged: false }),
    ).toHaveLength(1)
    expect(filterRuns(mixed, { sinceDays: null, input: null, excludeFlagged: true })).toHaveLength(
      12,
    )
  })

  it('computes domain composites as ability gained since the first run', () => {
    const comps = domainComposites(runs)
    const groups = comps.map((c) => c.group)
    expect(groups).toContain('executive')
    const last = comps[0]!.points.at(-1)!
    expect(last.y).toBeCloseTo(1.1, 6) // 2.0 → 3.1 levels
  })

  it('compares two dates in the domain profile and counts days', () => {
    const from = new Date(runs[0]!.started_at).getTime()
    const to = new Date(runs.at(-1)!.started_at).getTime()
    const prof = domainProfile(runs, from, to)
    expect(prof[0]!.to).toBeGreaterThan(prof[0]!.from)
    expect(runsPerDay(runs)).toHaveLength(12)
    expect(summaryStats(runs)).toMatchObject({ runs: 12, sessions: 6, minutes: 24, activeDays: 12 })
  })
})
