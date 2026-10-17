/**
 * Patient-mode PIN. It only prevents a patient from leaving the exercise
 * screen and reaching the therapist workspace on the same laptop; it is stored
 * as a salted PBKDF2 hash on this device (never sent anywhere).
 */
const KEY = 'sinapsi.patient-mode-pin'

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 150_000 },
    material,
    256,
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

export function hasPin(): boolean {
  try {
    return !!localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt)
  localStorage.setItem(KEY, JSON.stringify({ salt: btoa(String.fromCharCode(...salt)), hash }))
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return true
    const { salt, hash } = JSON.parse(raw) as { salt: string; hash: string }
    const saltBytes = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0))
    return (await derive(pin, saltBytes)) === hash
  } catch {
    return false
  }
}

export function clearPin() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
