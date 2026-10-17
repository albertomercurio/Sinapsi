import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/shared/api/supabase'
import { unwrap } from '@/shared/api/errors'
import type {
  Session,
  SessionItem,
  SessionMode,
  SessionStatus,
  SessionTemplate,
} from '@/shared/api/types'

/** One activity in a session or template. difficulty = null → adaptive. */
export interface PlanItem {
  activity_id: string
  difficulty: number | null
  locked: boolean
  config: Record<string, unknown>
}

export interface SessionWithItems extends Session {
  session_items: SessionItem[]
}

export interface SessionListRow extends Session {
  session_items: { activity_id: string }[]
  patients: { code: string } | null
}

export const sessionKeys = {
  all: ['sessions'] as const,
  patient: (id: string) => ['sessions', 'patient', id] as const,
  range: (orgId: string | null, from: string, to: string) =>
    ['sessions', 'range', orgId, from, to] as const,
  one: (id: string) => ['sessions', 'one', id] as const,
  templates: (orgId: string | null) => ['templates', orgId] as const,
  template: (id: string) => ['templates', 'one', id] as const,
}

export function usePatientSessions(patientId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => sessionKeys.patient(toValue(patientId))),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('sessions')
          .select('*, session_items(activity_id), patients(code)')
          .eq('patient_id', toValue(patientId))
          .order('scheduled_for', { ascending: false })
          .order('created_at', { ascending: false }),
      ) as unknown as SessionListRow[],
  })
}

export function useSessionsInRange(
  orgId: MaybeRefOrGetter<string | null>,
  from: MaybeRefOrGetter<string>,
  to: MaybeRefOrGetter<string>,
) {
  return useQuery({
    queryKey: computed(() => sessionKeys.range(toValue(orgId), toValue(from), toValue(to))),
    enabled: computed(() => !!toValue(orgId)),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('sessions')
          .select('*, session_items(activity_id), patients(code)')
          .eq('org_id', toValue(orgId)!)
          .gte('scheduled_for', toValue(from))
          .lte('scheduled_for', toValue(to))
          .neq('status', 'cancelled')
          .order('scheduled_for')
          .order('created_at'),
      ) as unknown as SessionListRow[],
  })
}

export function useSession(id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => sessionKeys.one(toValue(id) ?? '')),
    enabled: computed(() => !!toValue(id)),
    queryFn: async () => {
      const s = unwrap(
        await supabase
          .from('sessions')
          .select('*, session_items(*)')
          .eq('id', toValue(id)!)
          .single(),
      ) as unknown as SessionWithItems
      s.session_items.sort((a, b) => a.position - b.position)
      return s
    },
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      patientId: string
      items: PlanItem[]
      title: string | null
      mode: SessionMode
      date: string
      templateId?: string | null
    }) =>
      unwrap(
        await supabase.rpc('create_session', {
          p_patient: input.patientId,
          p_items: input.items as never,
          p_title: input.title ?? undefined,
          p_mode: input.mode,
          p_date: input.date,
          p_template: input.templateId ?? undefined,
        }),
      ) as string,
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      items,
    }: {
      id: string
      patch: Partial<
        Pick<
          Session,
          'title' | 'mode' | 'scheduled_for' | 'status' | 'started_at' | 'completed_at' | 'notes'
        >
      >
      items?: PlanItem[]
    }) => {
      if (items)
        unwrap(
          await supabase.rpc('replace_session_items', { p_session: id, p_items: items as never }),
        )
      if (Object.keys(patch).length)
        unwrap(await supabase.from('sessions').update(patch).eq('id', id))
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('sessions').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  })
}

export function setSessionStatus(id: string, status: SessionStatus) {
  const now = new Date().toISOString()
  const patch: Partial<Session> = { status }
  if (status === 'in_progress') patch.started_at = now
  if (status === 'completed') patch.completed_at = now
  return supabase.from('sessions').update(patch).eq('id', id)
}

// --- templates ---------------------------------------------------------------

export function useTemplates(orgId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => sessionKeys.templates(toValue(orgId))),
    enabled: computed(() => !!toValue(orgId)),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('session_templates')
          .select('*')
          .eq('org_id', toValue(orgId)!)
          .order('title'),
      ),
  })
}

export function useTemplate(id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => sessionKeys.template(toValue(id) ?? '')),
    enabled: computed(() => !!toValue(id)),
    queryFn: async () =>
      unwrap(await supabase.from('session_templates').select('*').eq('id', toValue(id)!).single()),
  })
}

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: {
      id?: string
      org_id: string
      title: string
      description: string | null
      items: PlanItem[]
    }) => {
      if (t.id) {
        return unwrap(
          await supabase
            .from('session_templates')
            .update({ title: t.title, description: t.description, items: t.items as never })
            .eq('id', t.id)
            .select('*')
            .single(),
        ) as SessionTemplate
      }
      return unwrap(
        await supabase
          .from('session_templates')
          .insert({
            org_id: t.org_id,
            title: t.title,
            description: t.description,
            items: t.items as never,
          })
          .select('*')
          .single(),
      ) as SessionTemplate
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await supabase.from('session_templates').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function itemsFromSession(items: SessionItem[]): PlanItem[] {
  return items.map((i) => ({
    activity_id: i.activity_id,
    difficulty: i.difficulty === null ? null : Number(i.difficulty),
    locked: i.locked,
    config: (i.config ?? {}) as Record<string, unknown>,
  }))
}

export function localDateString(d = new Date()): string {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

/** Drops UI-only fields (drag-and-drop keys) before saving. */
export function cleanItems(items: PlanItem[]): PlanItem[] {
  return items.map(({ activity_id, difficulty, locked, config }) => ({
    activity_id,
    difficulty,
    locked,
    config,
  }))
}
