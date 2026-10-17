import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/api/supabase'
import { isSupportedLocale, setLocale } from '@/app/i18n'
import type { AppRole } from '@/app/module'

export interface Membership {
  org_id: string
  org_name: string
  role: 'owner' | 'therapist'
  patient_code_prefix: string
  idle_timeout_min: number
  raw_retention_months: number
}

export interface UserContext {
  user_id: string
  email: string
  is_platform_admin: boolean
  profile: { display_name: string | null; ui_locale: string } | null
  memberships: Membership[]
}

type Aal = 'aal1' | 'aal2' | null

const ORG_KEY = 'sinapsi.org'

export const useAuthStore = defineStore('auth', () => {
  const session = shallowRef<Session | null>(null)
  const currentLevel = ref<Aal>(null)
  const nextLevel = ref<Aal>(null)
  const context = ref<UserContext | null>(null)
  const selectedOrgId = ref<string | null>(readOrg())
  const signOutReason = ref<'idle' | null>(null)
  let initPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => !!session.value)
  const isAal2 = computed(() => currentLevel.value === 'aal2')
  /** Has a verified factor but this session has not used it yet. */
  const needsMfaVerify = computed(
    () => isAuthenticated.value && currentLevel.value === 'aal1' && nextLevel.value === 'aal2',
  )
  /** No verified factor at all: enrollment is mandatory. */
  const needsMfaEnroll = computed(
    () => isAuthenticated.value && currentLevel.value === 'aal1' && nextLevel.value === 'aal1',
  )
  const isPlatformAdmin = computed(() => !!context.value?.is_platform_admin)
  const memberships = computed(() => context.value?.memberships ?? [])
  const currentMembership = computed<Membership | null>(() => {
    const list = memberships.value
    return list.find((m) => m.org_id === selectedOrgId.value) ?? list[0] ?? null
  })
  const currentOrgId = computed(() => currentMembership.value?.org_id ?? null)
  const roles = computed<AppRole[]>(() => {
    const r: AppRole[] = []
    if (isPlatformAdmin.value) r.push('platform_admin')
    if (currentMembership.value) r.push(currentMembership.value.role)
    return r
  })
  const displayName = computed(
    () => context.value?.profile?.display_name || context.value?.email || '',
  )

  async function refreshAal() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) throw error
    currentLevel.value = (data.currentLevel as Aal) ?? null
    nextLevel.value = (data.nextLevel as Aal) ?? null
  }

  async function loadContext() {
    if (!isAal2.value) {
      context.value = null
      return
    }
    const { data, error } = await supabase.rpc('my_context')
    if (error) throw error
    context.value = (data as unknown as UserContext) ?? null
    const locale = context.value?.profile?.ui_locale
    if (isSupportedLocale(locale)) await setLocale(locale)
  }

  async function applySession(next: Session | null) {
    session.value = next
    if (next) {
      await refreshAal()
      await loadContext()
    } else {
      currentLevel.value = null
      nextLevel.value = null
      context.value = null
    }
  }

  function init(): Promise<void> {
    initPromise ??= (async () => {
      const { data } = await supabase.auth.getSession()
      await applySession(data.session)
      supabase.auth.onAuthStateChange((event, next) => {
        // Avoid awaiting inside the callback (supabase-js lock); defer the work.
        if (event === 'SIGNED_OUT') {
          void applySession(null)
        } else if (event === 'MFA_CHALLENGE_VERIFIED' || event === 'SIGNED_IN') {
          setTimeout(() => void applySession(next), 0)
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          session.value = next
        }
      })
    })()
    return initPromise
  }

  /** Re-reads the current session (e.g. right after verifying an e-mail link). */
  async function syncSession() {
    const { data } = await supabase.auth.getSession()
    await applySession(data.session)
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    signOutReason.value = null
    await applySession(data.session)
  }

  async function verifyTotp(factorId: string, code: string) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
    const { data } = await supabase.auth.getSession()
    await applySession(data.session)
  }

  async function signOut(reason: 'idle' | null = null) {
    signOutReason.value = reason
    await supabase.auth.signOut({ scope: 'local' })
    await applySession(null)
  }

  function selectOrg(orgId: string) {
    selectedOrgId.value = orgId
    try {
      localStorage.setItem(ORG_KEY, orgId)
    } catch {
      // ignore
    }
  }

  async function updateProfile(patch: { display_name?: string | null; ui_locale?: string }) {
    const uid = context.value?.user_id
    if (!uid) return
    const { error } = await supabase.from('profiles').update(patch).eq('user_id', uid)
    if (error) throw error
    await loadContext()
  }

  return {
    session,
    currentLevel,
    nextLevel,
    context,
    signOutReason,
    isAuthenticated,
    isAal2,
    needsMfaVerify,
    needsMfaEnroll,
    isPlatformAdmin,
    memberships,
    currentMembership,
    currentOrgId,
    roles,
    displayName,
    init,
    syncSession,
    refreshAal,
    loadContext,
    signIn,
    verifyTotp,
    signOut,
    selectOrg,
    updateProfile,
  }
})

function readOrg(): string | null {
  try {
    return localStorage.getItem(ORG_KEY)
  } catch {
    return null
  }
}
