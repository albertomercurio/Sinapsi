import type { Component } from 'vue'
import type { z } from 'zod'
import type { Rng } from '@/shared/lib/rng'
import type { RunRecording } from '@/modules/measurement'
import type { ContentPack } from '@/content'
import type { AgeGroup, CognitiveDomain } from './taxonomy'

export type ActivityFormat = 'digital' | 'paper'

export interface GenerateContext<C> {
  rng: Rng
  config: C
  difficulty: number
  ageGroup: AgeGroup
  locale: string
  content: ContentPack
}

export type MetricValue = number | null

export interface ScoreResult {
  /** 0–100, shown to therapists. */
  score: number
  /** 0–1 graded outcome fed to the ability engine (speed–accuracy integrated). */
  performance: number
  metrics: Record<string, MetricValue>
  flags?: string[]
  /**
   * Optional item-level outcomes (difficulty on the 1–5 scale, outcome 0–1).
   * When present the ability engine updates once per item, as in Math Garden;
   * otherwise once per run with (run difficulty, performance).
   */
  items?: { difficulty: number; outcome: number }[]
}

export type MetricUnit =
  'ms' | 'percent' | 'count' | 'ratio' | 'index' | 'seconds' | 'span' | 'perMin'

export interface MetricDescriptor {
  key: string
  /** Translation key; defaults to `metrics.<key>` (shared) when omitted. */
  labelKey?: string
  unit: MetricUnit
  /** +1 higher is better, −1 lower is better, 0 neutral/descriptive. */
  polarity: 1 | -1 | 0
  /** Shown first in trend charts. */
  primary?: boolean
}

export interface PlayerProps<C, I> {
  instance: I
  config: C
  recorder: import('@/modules/measurement').TrialRecorder
  ageGroup: AgeGroup
  kids: boolean
  paused: boolean
}

/**
 * The contract every activity plugin implements (src/activities/<id>/index.ts).
 * Generators are pure functions of (seed, config): the same seed always yields
 * the same exercise, so runs can be replayed and re-scored.
 */
// The registry holds heterogeneous plugins, so the defaults are deliberately `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActivityDefinition<C = any, I = any> {
  id: string
  /** Bump when the generator or the task changes. */
  version: number
  /** Bump when the scoring formula changes (old runs can be re-scored from raw events). */
  scoringVersion: number
  icon: string
  domains: CognitiveDomain[]
  ageGroups: AgeGroup[]
  formats: ActivityFormat[]
  languageDependent: boolean
  /** Run a short simple-reaction baseline first (separates motor/device speed). */
  needsMotorBaseline?: boolean
  /** Below this many trials a run is flagged `few_trials` (default 3; single-sheet tasks use 1). */
  minTrials?: number
  estimatedMinutes: number
  configSchema: z.ZodType<C>
  /** Continuous difficulty (1–5) → concrete configuration. */
  configFor(difficulty: number, ageGroup: AgeGroup): C
  generate(ctx: GenerateContext<C>): I
  score(
    instance: I,
    recording: RunRecording,
    ctx: { config: C; baselineRt: number | null },
  ): ScoreResult
  metrics: MetricDescriptor[]
  player: () => Promise<{ default: Component }>
  print?: () => Promise<{ default: Component }>
}

export function defineActivity<C, I>(def: ActivityDefinition<C, I>): ActivityDefinition<C, I> {
  return def
}
