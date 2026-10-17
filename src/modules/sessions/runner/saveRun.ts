import { supabase } from '@/shared/api/supabase'
import { unwrap } from '@/shared/api/errors'
import type { SessionMode } from '@/shared/api/types'
import { type Ability, round, updateAbility } from '@/modules/scoring'
import { packRecording, toByteaHex } from '@/modules/measurement'
import type { CompletedRun } from '@/modules/activities/runtime/types'

export interface SaveContext {
  patientId: string
  sessionId: string | null
  sessionItemId: string | null
  mode: SessionMode
  abilityBefore: Ability
}

/** New ability after a run: item-level updates when the activity provides them (span tasks), else one per run. */
export function abilityAfter(run: CompletedRun, before: Ability): Ability {
  let a = before
  if (run.result.items?.length) {
    for (const it of run.result.items) a = updateAbility(a, it.difficulty, it.outcome)
  } else {
    a = updateAbility(a, run.difficulty, run.result.performance)
  }
  return { rating: a.rating, rd: a.rd }
}

/**
 * Persists a finished run: summary metrics, compressed raw events and the
 * updated ability rating, atomically (public.record_activity_run).
 */
export async function saveCompletedRun(
  run: CompletedRun,
  ctx: SaveContext,
): Promise<{ id: string; ability: Ability }> {
  const after = abilityAfter(run, ctx.abilityBefore)
  const payload = {
    patient_id: ctx.patientId,
    session_id: ctx.sessionId,
    session_item_id: ctx.sessionItemId,
    activity_id: run.activityId,
    activity_version: run.activityVersion,
    scoring_version: run.scoringVersion,
    difficulty: round(run.difficulty, 2),
    seed: run.seed,
    config: run.config,
    device: run.recording.device,
    mode: ctx.mode,
    started_at: run.recording.startedAt,
    duration_ms: run.recording.durationMs,
    score: run.result.score,
    performance: run.result.performance,
    metrics: run.result.metrics,
    quality_flags: run.qualityFlags,
    rating_before: round(ctx.abilityBefore.rating, 2),
    rating_after: round(after.rating, 2),
    rd_after: round(after.rd, 2),
  }
  const events = toByteaHex(packRecording(run.recording))
  const id = unwrap(
    await supabase.rpc('record_activity_run', {
      p_run: payload as never,
      p_events: events,
      p_ability: { rating: round(after.rating, 2), rd: round(after.rd, 2) } as never,
    }),
  ) as string
  return { id, ability: after }
}
