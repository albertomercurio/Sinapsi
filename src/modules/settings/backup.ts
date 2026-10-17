import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { supabase } from '@/shared/api/supabase'
import { unwrap } from '@/shared/api/errors'

/**
 * Encrypted organization backups. Everything happens in the browser: the
 * passphrase and the plaintext never leave the device. Format:
 *   "SNPSBK01" | iterations (uint32 BE) | salt (16) | iv (12) | AES-256-GCM(deflate(JSON))
 * with the key derived by PBKDF2-SHA-256 (600 000 iterations, OWASP 2023).
 */
export const BACKUP_TABLES = [
  'patients',
  'patient_conditions',
  'session_templates',
  'sessions',
  'session_items',
  'activity_runs',
  'activity_run_events',
  'patient_ability',
] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]

export interface BackupDoc {
  format: 'sinapsi-backup'
  version: 1
  created_at: string
  /** name_key = public parameters of the names passphrase (never the key itself). */
  org: { id: string; name: string; name_key?: unknown }
  tables: Record<BackupTable, Record<string, unknown>[]>
}

const MAGIC = strToU8('SNPSBK01')
export const DEFAULT_ITERATIONS = 600_000

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', strToU8(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBackup(
  doc: BackupDoc,
  passphrase: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt, iterations)
  const plain = deflateSync(strToU8(JSON.stringify(doc)), { level: 6 })
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      plain as BufferSource,
    ),
  )
  const out = new Uint8Array(MAGIC.length + 4 + salt.length + iv.length + cipher.length)
  let o = 0
  out.set(MAGIC, o)
  o += MAGIC.length
  new DataView(out.buffer).setUint32(o, iterations)
  o += 4
  out.set(salt, o)
  o += salt.length
  out.set(iv, o)
  o += iv.length
  out.set(cipher, o)
  return out
}

export class BackupError extends Error {
  constructor(readonly code: 'format' | 'passphrase') {
    super(code)
  }
}

export async function decryptBackup(bytes: Uint8Array, passphrase: string): Promise<BackupDoc> {
  if (bytes.length < 40 || strFromU8(bytes.slice(0, MAGIC.length)) !== 'SNPSBK01')
    throw new BackupError('format')
  let o = MAGIC.length
  const iterations = new DataView(bytes.buffer, bytes.byteOffset).getUint32(o)
  o += 4
  const salt = bytes.slice(o, o + 16)
  o += 16
  const iv = bytes.slice(o, o + 12)
  o += 12
  const key = await deriveKey(passphrase, salt, iterations)
  let plain: Uint8Array
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        bytes.slice(o) as BufferSource,
      ),
    )
  } catch {
    throw new BackupError('passphrase')
  }
  const doc = JSON.parse(strFromU8(inflateSync(plain))) as BackupDoc
  if (doc.format !== 'sinapsi-backup') throw new BackupError('format')
  return doc
}

async function fetchAll(table: BackupTable, orgId: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  const page = table === 'activity_run_events' ? 200 : 1000
  for (let from = 0; ; from += page) {
    const chunk = unwrap(
      await supabase
        .from(table)
        .select('*')
        .eq('org_id', orgId)
        .range(from, from + page - 1),
    ) as Record<string, unknown>[]
    rows.push(...chunk)
    if (chunk.length < page) break
  }
  return rows
}

export async function collectOrgData(
  org: BackupDoc['org'],
  onProgress?: (t: BackupTable) => void,
): Promise<BackupDoc> {
  const tables = {} as BackupDoc['tables']
  for (const t of BACKUP_TABLES) {
    onProgress?.(t)
    tables[t] = await fetchAll(t, org.id)
  }
  return { format: 'sinapsi-backup', version: 1, created_at: new Date().toISOString(), org, tables }
}

/** Restores into `orgId` table by table, in dependency order, in small chunks. */
export async function restoreBackup(
  doc: BackupDoc,
  orgId: string,
  onProgress?: (done: number, total: number) => void,
) {
  const total = BACKUP_TABLES.reduce((s, t) => s + (doc.tables[t]?.length ?? 0), 0)
  let done = 0
  let inserted = 0
  // Encrypted names stay readable with the original passphrase.
  if (doc.org.name_key) {
    unwrap(
      await supabase.rpc('restore_rows', {
        p_org: orgId,
        p_table: 'organization_name_key',
        p_rows: [{ name_key: doc.org.name_key }] as never,
      }),
    )
  }
  for (const t of BACKUP_TABLES) {
    const rows = doc.tables[t] ?? []
    const size = t === 'activity_run_events' ? 25 : 200
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size)
      inserted += unwrap(
        await supabase.rpc('restore_rows', { p_org: orgId, p_table: t, p_rows: chunk as never }),
      ) as number
      done += chunk.length
      onProgress?.(done, total)
    }
  }
  await supabase.rpc('log_event', {
    p_org: orgId,
    p_action: 'backup_restore',
    p_entity: 'organizations',
    p_entity_id: orgId,
    p_details: { from_backup: doc.created_at, rows: total, inserted },
  })
  return { total, inserted }
}

const LAST_KEY = (orgId: string) => `sinapsi.last-backup.${orgId}`

export function lastBackupAt(orgId: string): Date | null {
  try {
    const v = localStorage.getItem(LAST_KEY(orgId))
    return v ? new Date(v) : null
  } catch {
    return null
  }
}

export function markBackup(orgId: string) {
  try {
    localStorage.setItem(LAST_KEY(orgId), new Date().toISOString())
  } catch {
    // ignore
  }
}

export function backupOverdue(orgId: string, days = 7): boolean {
  const last = lastBackupAt(orgId)
  return !last || Date.now() - last.getTime() > days * 86_400_000
}
