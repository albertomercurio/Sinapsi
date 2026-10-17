import { describe, expect, it } from 'vitest'
import { BackupError, decryptBackup, encryptBackup, type BackupDoc } from './backup'

const doc: BackupDoc = {
  format: 'sinapsi-backup',
  version: 1,
  created_at: '2026-10-17T10:00:00.000Z',
  org: { id: 'o1', name: 'Studio' },
  tables: {
    patients: [{ id: 'p1', code: 'PZ-ABCD', birth_year: 1950 }],
    patient_conditions: [],
    session_templates: [],
    sessions: [],
    session_items: [],
    activity_runs: [{ id: 'r1', metrics: { dPrime: 2.1 } }],
    activity_run_events: [{ run_id: 'r1', payload: '\\x00ff' }],
    patient_ability: [],
  },
}

describe('encrypted backups', () => {
  it('round-trips with the right passphrase', async () => {
    const bytes = await encryptBackup(doc, 'correct horse battery staple', 1000)
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe('SNPSBK01')
    // The plaintext must not be visible in the file.
    expect(new TextDecoder().decode(bytes).includes('PZ-ABCD')).toBe(false)
    expect(await decryptBackup(bytes, 'correct horse battery staple')).toEqual(doc)
  })

  it('rejects a wrong passphrase and a foreign file', async () => {
    const bytes = await encryptBackup(doc, 'secret-one', 1000)
    await expect(decryptBackup(bytes, 'secret-two')).rejects.toThrow(BackupError)
    await expect(
      decryptBackup(new TextEncoder().encode('not a backup file at all, sorry!!!!!!!!'), 'x'),
    ).rejects.toMatchObject({ code: 'format' })
  })

  it('detects tampering (authenticated encryption)', async () => {
    const bytes = await encryptBackup(doc, 'pw', 1000)
    bytes[bytes.length - 5]! ^= 0xff
    await expect(decryptBackup(bytes, 'pw')).rejects.toMatchObject({ code: 'passphrase' })
  })
})
