import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { FunctionRegion, FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/shared/api/supabase'
import { unwrap } from '@/shared/api/errors'

export interface InviteInput {
  email: string
  orgId?: string
  newOrgName?: string
  role: 'owner' | 'therapist'
}

/** Calls the admin-invite Edge Function, pinned to Frankfurt. */
export async function invite(
  input: InviteInput,
): Promise<{ ok: boolean; existing: boolean; orgId: string }> {
  const { data, error } = await supabase.functions.invoke('admin-invite', {
    body: input,
    region: FunctionRegion.EuCentral1,
  })
  if (error) {
    let code = 'invite_failed'
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => ({}))
      code = body.error ?? code
    }
    throw Object.assign(new Error(code), { code: `invite.${code}` })
  }
  return data
}

export function useOrgMembers(orgId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => ['members', toValue(orgId)]),
    enabled: computed(() => !!toValue(orgId)),
    queryFn: async () => unwrap(await supabase.rpc('org_members', { p_org: toValue(orgId)! })),
  })
}

export function useInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: invite,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: { orgId: string; userId: string }) =>
      unwrap(
        await supabase.from('memberships').delete().eq('org_id', m.orgId).eq('user_id', m.userId),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useSetRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: { orgId: string; userId: string; role: 'owner' | 'therapist' }) =>
      unwrap(
        await supabase
          .from('memberships')
          .update({ role: m.role })
          .eq('org_id', m.orgId)
          .eq('user_id', m.userId),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => unwrap(await supabase.rpc('admin_overview')),
  })
}

export function useAdminStorage() {
  return useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: async () =>
      (
        unwrap(await supabase.rpc('admin_storage')) as {
          database_bytes: number
          raw_event_bytes: number
          runs: number
        }[]
      )[0] ?? null,
  })
}
