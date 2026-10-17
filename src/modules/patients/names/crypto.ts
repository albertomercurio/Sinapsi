/**
 * End-to-end encryption of patient names. Runs only in the browser:
 * PBKDF2-SHA-256 (600 000 iterations) derives an AES-256-GCM key from the
 * practice passphrase; names are encrypted with a random IV and the practice id
 * as additional authenticated data (a ciphertext cannot be moved to another
 * practice). The key is non-extractable and never sent anywhere.
 */
export interface NameKeyParams {
  v: 1
  salt: string
  iterations: number
  /** Encrypted constant used to verify the passphrase. */
  check: string
}

export interface PatientName {
  first: string
  last: string
}

const enc = new TextEncoder()
const dec = new TextDecoder()
const CHECK_PLAINTEXT = 'sinapsi-name-key-v1'
export const DEFAULT_NAME_ITERATIONS = 600_000

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const aad = (kind: 'name' | 'check', orgId: string) => enc.encode(`sinapsi:${kind}:v1:${orgId}`)

export async function deriveNameKey(
  passphrase: string,
  params: Pick<NameKeyParams, 'salt' | 'iterations'>,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: unb64(params.salt) as BufferSource,
      iterations: params.iterations,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function seal(key: CryptoKey, plaintext: string, additional: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource, additionalData: additional as BufferSource },
      key,
      enc.encode(plaintext) as BufferSource,
    ),
  )
  return `v1.${b64(iv)}.${b64(ct)}`
}

async function open(
  key: CryptoKey,
  sealed: string,
  additional: Uint8Array,
): Promise<string | null> {
  const [v, iv, ct] = sealed.split('.')
  if (v !== 'v1' || !iv || !ct) return null
  try {
    const pt = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: unb64(iv) as BufferSource,
        additionalData: additional as BufferSource,
      },
      key,
      unb64(ct) as BufferSource,
    )
    return dec.decode(pt)
  } catch {
    return null
  }
}

/** New passphrase → parameters to store on the practice + the derived key. */
export async function createNameKey(
  passphrase: string,
  orgId: string,
  iterations = DEFAULT_NAME_ITERATIONS,
) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)))
  const key = await deriveNameKey(passphrase, { salt, iterations })
  const params: NameKeyParams = {
    v: 1,
    salt,
    iterations,
    check: await seal(key, CHECK_PLAINTEXT, aad('check', orgId)),
  }
  return { key, params }
}

/** The derived key if the passphrase is right, otherwise null. */
export async function unlockNameKey(
  passphrase: string,
  params: NameKeyParams,
  orgId: string,
): Promise<CryptoKey | null> {
  const key = await deriveNameKey(passphrase, params)
  return (await open(key, params.check, aad('check', orgId))) === CHECK_PLAINTEXT ? key : null
}

export function encryptName(key: CryptoKey, name: PatientName, orgId: string): Promise<string> {
  return seal(
    key,
    JSON.stringify({ f: name.first.trim(), l: name.last.trim() }),
    aad('name', orgId),
  )
}

export async function decryptName(
  key: CryptoKey,
  sealed: string,
  orgId: string,
): Promise<PatientName | null> {
  const json = await open(key, sealed, aad('name', orgId))
  if (!json) return null
  try {
    const o = JSON.parse(json) as { f?: string; l?: string }
    return { first: o.f ?? '', last: o.l ?? '' }
  } catch {
    return null
  }
}

export function formatName(
  n: PatientName | null | undefined,
  order: 'first-last' | 'last-first' = 'last-first',
): string {
  if (!n) return ''
  return (order === 'last-first' ? [n.last, n.first] : [n.first, n.last]).filter(Boolean).join(' ')
}
