import { execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

/**
 * The reset restarts the containers; the first call to the Edge Function can
 * arrive before its worker has booted. Wait until it answers a preflight.
 */
async function waitForFunction(name: string) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`http://127.0.0.1:54321/functions/v1/${name}`, {
      method: 'OPTIONS',
    }).catch(() => null)
    if (res?.ok) return
    await sleep(1000)
  }
  throw new Error(`Edge Function ${name} did not start`)
}

/** Fresh database (migrations + synthetic seed) and an empty mailbox for every run. */
export default async function globalSetup() {
  execSync('pnpm exec supabase db reset', { stdio: 'inherit' })
  await fetch('http://127.0.0.1:54324/api/v1/messages', { method: 'DELETE' }).catch(() => undefined)
  await waitForFunction('admin-accounts')
}
