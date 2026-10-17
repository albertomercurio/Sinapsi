import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/shared/api/supabase'
import { unwrap } from '@/shared/api/errors'
import type { ActivityRun, PatientAbility } from '@/shared/api/types'
import { fromByteaHex, unpackRecording, type RunRecording } from '@/modules/measurement'

export const resultKeys = {
  runs: (patientId: string) => ['runs', patientId] as const,
  run: (id: string) => ['run', id] as const,
  events: (id: string) => ['run-events', id] as const,
  abilities: (patientId: string) => ['abilities', patientId] as const,
}

export function usePatientRuns(patientId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => resultKeys.runs(toValue(patientId))),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('activity_runs')
          .select('*')
          .eq('patient_id', toValue(patientId))
          .order('started_at', { ascending: true })
          .limit(5000),
      ) as ActivityRun[],
  })
}

export async function fetchAbilities(patientId: string): Promise<PatientAbility[]> {
  return unwrap(
    await supabase.from('patient_ability').select('*').eq('patient_id', patientId),
  ) as PatientAbility[]
}

export function usePatientAbilities(patientId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => resultKeys.abilities(toValue(patientId))),
    queryFn: () => fetchAbilities(toValue(patientId)),
  })
}

export function useRun(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => resultKeys.run(toValue(id))),
    queryFn: async () =>
      unwrap(
        await supabase.from('activity_runs').select('*').eq('id', toValue(id)).single(),
      ) as ActivityRun,
  })
}

/** Raw event log of a run (null once purged by the retention policy). */
export function useRunEvents(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => resultKeys.events(toValue(id))),
    queryFn: async (): Promise<{
      recording: RunRecording
      pinned: boolean
      expires_at: string | null
    } | null> => {
      const row = unwrap(
        await supabase
          .from('activity_run_events')
          .select('payload, pinned, expires_at')
          .eq('run_id', toValue(id))
          .maybeSingle(),
      )
      if (!row) return null
      return {
        recording: unpackRecording(fromByteaHex(row.payload as unknown as string)),
        pinned: row.pinned,
        expires_at: row.expires_at,
      }
    },
  })
}

export function usePinRunEvents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ runId, pinned }: { runId: string; pinned: boolean }) =>
      unwrap(await supabase.from('activity_run_events').update({ pinned }).eq('run_id', runId)),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: resultKeys.events(v.runId) }),
  })
}

export function useLockAbility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      patientId: string
      activityId: string
      locked: boolean
      difficulty: number | null
      existing: boolean
    }) => {
      if (v.existing) {
        return unwrap(
          await supabase
            .from('patient_ability')
            .update({ locked: v.locked, locked_difficulty: v.locked ? v.difficulty : null })
            .eq('patient_id', v.patientId)
            .eq('activity_id', v.activityId),
        )
      }
      // No runs yet: create the row with the initial ability so the lock can be stored.
      const { initialAbility } = await import('@/modules/scoring')
      const a = initialAbility()
      return unwrap(
        await supabase.from('patient_ability').insert({
          patient_id: v.patientId,
          activity_id: v.activityId,
          rating: a.rating,
          rd: a.rd,
          n_runs: 0,
          locked: v.locked,
          locked_difficulty: v.locked ? v.difficulty : null,
        } as never),
      )
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: resultKeys.abilities(v.patientId) }),
  })
}

export function useDeleteRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (run: Pick<ActivityRun, 'id' | 'patient_id'>) => {
      unwrap(await supabase.from('activity_runs').delete().eq('id', run.id))
      return run
    },
    onSuccess: (run) => qc.invalidateQueries({ queryKey: resultKeys.runs(run.patient_id) }),
  })
}
