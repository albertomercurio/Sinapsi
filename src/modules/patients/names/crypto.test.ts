import { describe, expect, it } from 'vitest'
import { createNameKey, decryptName, encryptName, formatName, unlockNameKey } from './crypto'

describe('end-to-end encrypted names', () => {
  it('round-trips a name and never stores plaintext', async () => {
    const { key, params } = await createNameKey('frase segreta dello studio', 'org-1', 1000)
    const sealed = await encryptName(key, { first: 'Maria', last: 'Rossi' }, 'org-1')
    expect(sealed).toMatch(/^v1\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/)
    expect(sealed.includes('Rossi')).toBe(false)
    const again = await unlockNameKey('frase segreta dello studio', params, 'org-1')
    expect(again).not.toBeNull()
    expect(await decryptName(again!, sealed, 'org-1')).toEqual({ first: 'Maria', last: 'Rossi' })
  })

  it('rejects a wrong passphrase', async () => {
    const { params } = await createNameKey('giusta', 'org-1', 1000)
    expect(await unlockNameKey('sbagliata', params, 'org-1')).toBeNull()
  })

  it('binds ciphertexts to the practice (cannot be replayed elsewhere)', async () => {
    const { key } = await createNameKey('x', 'org-1', 1000)
    const sealed = await encryptName(key, { first: 'Luca', last: 'Bianchi' }, 'org-1')
    expect(await decryptName(key, sealed, 'org-2')).toBeNull()
  })

  it('uses a fresh IV for every encryption', async () => {
    const { key } = await createNameKey('x', 'org-1', 1000)
    const a = await encryptName(key, { first: 'A', last: 'B' }, 'org-1')
    const b = await encryptName(key, { first: 'A', last: 'B' }, 'org-1')
    expect(a).not.toBe(b)
  })

  it('formats names', () => {
    expect(formatName({ first: 'Maria', last: 'Rossi' })).toBe('Rossi Maria')
    expect(formatName({ first: 'Maria', last: '' }, 'first-last')).toBe('Maria')
  })
})
