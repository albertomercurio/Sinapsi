import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/shared/api/supabase'
import { unwrap } from '@/shared/api/errors'
import { useAuthStore } from '@/modules/auth/store'
import {
  createNameKey,
  decryptName,
  encryptName,
  formatName,
  unlockNameKey,
  type NameKeyParams,
  type PatientName,
} from './crypto'
import { forgetStoredKey, loadStoredKey, storeKey } from './keystore'

export type NamesStatus = 'disabled' | 'locked' | 'unlocked'

/**
 * Names of the current practice's patients, decrypted in memory only.
 * status: 'disabled' (the practice has no passphrase yet), 'locked' (this device
 * does not have the key), 'unlocked'.
 */
export const useNamesStore = defineStore('patient-names', () => {
  const auth = useAuthStore()
  const keys = reactive(new Map<string, CryptoKey>())
  const cache = reactive(new Map<string, PatientName | null>())
  const loading = ref(false)

  const orgId = computed(() => auth.currentOrgId)
  const params = computed(
    () => (auth.currentMembership as { name_key?: NameKeyParams | null } | null)?.name_key ?? null,
  )
  const key = computed(() => (orgId.value ? (keys.get(orgId.value) ?? null) : null))
  const status = computed<NamesStatus>(() =>
    !params.value ? 'disabled' : key.value ? 'unlocked' : 'locked',
  )
  const isOwner = computed(() => auth.currentMembership?.role === 'owner')

  // Restore a key remembered on this device when the practice changes.
  watch(
    [orgId, params],
    async ([id, p]) => {
      if (!id || !p || keys.has(id)) return
      const stored = await loadStoredKey(id)
      if (stored) keys.set(id, stored)
    },
    { immediate: true },
  )

  async function unlock(passphrase: string, remember = true): Promise<boolean> {
    if (!orgId.value || !params.value) return false
    const k = await unlockNameKey(passphrase, params.value, orgId.value)
    if (!k) return false
    keys.set(orgId.value, k)
    cache.clear()
    if (remember) await storeKey(orgId.value, k)
    return true
  }

  async function lock() {
    if (!orgId.value) return
    keys.delete(orgId.value)
    cache.clear()
    await forgetStoredKey(orgId.value)
  }

  /** Owner: turn names on with a new passphrase (stores only public parameters). */
  async function enable(passphrase: string) {
    const id = orgId.value!
    const { key: k, params: p } = await createNameKey(passphrase, id)
    unwrap(
      await supabase
        .from('organizations')
        .update({ name_key: p as never })
        .eq('id', id),
    )
    keys.set(id, k)
    await storeKey(id, k)
    await auth.loadContext()
  }

  /** Owner: new passphrase; every name is re-encrypted in the browser and saved atomically. */
  async function changePassphrase(passphrase: string) {
    const id = orgId.value!
    const old = key.value
    if (!old) throw new Error('locked')
    const rows = unwrap(
      await supabase
        .from('patients')
        .select('id, name_enc')
        .eq('org_id', id)
        .not('name_enc', 'is', null),
    )
    const { key: k, params: p } = await createNameKey(passphrase, id)
    const names = await Promise.all(
      rows.map(async (r) => {
        const n = await decryptName(old, r.name_enc!, id)
        return { id: r.id, name_enc: n ? await encryptName(k, n, id) : null }
      }),
    )
    unwrap(
      await supabase.rpc('rekey_patient_names', {
        p_org: id,
        p_name_key: p as never,
        p_names: names as never,
      }),
    )
    keys.set(id, k)
    await storeKey(id, k)
    cache.clear()
    await auth.loadContext()
  }

  /** Owner, lost passphrase: erase every name (codes and clinical data stay). */
  async function reset() {
    const id = orgId.value!
    unwrap(await supabase.rpc('reset_patient_names', { p_org: id }))
    keys.delete(id)
    cache.clear()
    await forgetStoredKey(id)
    await auth.loadContext()
  }

  async function encrypt(name: PatientName): Promise<string | null> {
    if (!key.value || !orgId.value) return null
    if (!name.first.trim() && !name.last.trim()) return null
    return encryptName(key.value, name, orgId.value)
  }

  /** Decrypts (and caches) the names of a list of patients. */
  async function decryptAll(
    patients: readonly { id: string; org_id: string; name_enc: string | null }[],
  ) {
    if (!key.value) return
    loading.value = true
    try {
      await Promise.all(
        patients.map(async (p) => {
          const ck = `${p.id}:${p.name_enc}`
          if (!p.name_enc || cache.has(ck)) return
          cache.set(ck, await decryptName(key.value!, p.name_enc, p.org_id))
        }),
      )
    } finally {
      loading.value = false
    }
  }

  function nameOf(
    p: { id: string; name_enc: string | null } | null | undefined,
  ): PatientName | null {
    if (!p?.name_enc) return null
    return cache.get(`${p.id}:${p.name_enc}`) ?? null
  }

  function label(p: { id: string; name_enc: string | null } | null | undefined): string {
    return formatName(nameOf(p))
  }

  return {
    status,
    isOwner,
    params,
    loading,
    unlock,
    lock,
    enable,
    changePassphrase,
    reset,
    encrypt,
    decryptAll,
    nameOf,
    label,
  }
})
