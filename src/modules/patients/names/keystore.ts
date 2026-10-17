/**
 * Remembers the derived names key on THIS device (IndexedDB). The CryptoKey is
 * non-extractable: it can be used to decrypt, but its bytes cannot be read or
 * copied. Storage may be unavailable (private browsing): then the passphrase is
 * simply asked again.
 */
const DB = 'sinapsi'
const STORE = 'name-keys'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

export const loadStoredKey = (orgId: string) =>
  tx<CryptoKey>('readonly', (s) => s.get(orgId) as IDBRequest<CryptoKey>)
export const storeKey = (orgId: string, key: CryptoKey) => tx('readwrite', (s) => s.put(key, orgId))
export const forgetStoredKey = (orgId: string) => tx('readwrite', (s) => s.delete(orgId))
