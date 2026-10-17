import { execSync } from 'node:child_process'

/** Fresh database (migrations + synthetic seed) and an empty mailbox for every run. */
export default async function globalSetup() {
  execSync('pnpm exec supabase db reset', { stdio: 'inherit' })
  await fetch('http://127.0.0.1:54324/api/v1/messages', { method: 'DELETE' }).catch(() => undefined)
}
