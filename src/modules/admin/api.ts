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
  /** 'link' = return a one-time link to deliver personally; 'email' = send it (needs SMTP). */
  delivery: 'link' | 'email'
}

export interface AccountResult {
  ok: boolean
  existing?: boolean
  orgId?: string
  /** One-time link (24 h) to deliver personally, when requested. */
  link?: string | null
  removed?: number
}

/** Calls the admin-accounts Edge Function, pinned to Frankfurt. */
async function callAccounts(body: Record<string, unknown>): Promise<AccountResult> {
  const { data, error } = await supabase.functions.invoke('admin-accounts', {
    body,
    region: FunctionRegion.EuCentral1,
  })
  if (error) {
    let code = 'invite_failed'
    if (error instanceof FunctionsHttpError) {
      const res = await error.context.json().catch(() => ({}))
      code = res.error ?? code
    }
    throw Object.assign(new Error(code), { code: `invite.${code}` })
  }
  return data
}

export const invite = (input: InviteInput) => callAccounts({ action: 'invite', ...input })
export const passwordLink = (userId: string) => callAccounts({ action: 'password_link', userId })
export const resetMfa = (userId: string) => callAccounts({ action: 'reset_mfa', userId })

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

export function usePasswordLink() {
  return useMutation({ mutationFn: passwordLink })
}

export function useResetMfa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: resetMfa,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}
