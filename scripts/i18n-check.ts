/**
 * Translation checks (run in CI): every locale has exactly the same keys as
 * Italian (the reference), no message is empty, and every message compiles
 * with the vue-i18n message compiler (catches stray `@`, `|`, `{` …).
 *
 *   pnpm i18n:check
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { baseCompile } from '@intlify/message-compiler'

const ROOT = new URL('../src', import.meta.url).pathname
const REFERENCE = 'it'

type Tree = { [k: string]: string | Tree }

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.includes('/locales/') && p.endsWith('.json')) out.push(p)
  }
  return out
}

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out.set(key, v)
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv)
  }
  return out
}

const files = walk(ROOT)
const dirs = [...new Set(files.map((f) => f.slice(0, f.lastIndexOf('/'))))]
const locales = [...new Set(files.map((f) => f.slice(f.lastIndexOf('/') + 1, -5)))]
const problems: string[] = []

for (const dir of dirs) {
  const rel = relative(ROOT, dir)
  const load = (code: string): Map<string, string> | null => {
    try {
      return flatten(JSON.parse(readFileSync(join(dir, `${code}.json`), 'utf8')))
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      problems.push(`${rel}/${code}.json: invalid JSON (${(e as Error).message})`)
      return null
    }
  }
  const ref = load(REFERENCE)
  if (!ref) {
    problems.push(`${rel}: missing ${REFERENCE}.json (reference locale)`)
    continue
  }
  for (const code of locales) {
    const msgs = code === REFERENCE ? ref : load(code)
    if (!msgs) {
      problems.push(`${rel}: missing ${code}.json`)
      continue
    }
    for (const key of ref.keys())
      if (!msgs.has(key)) problems.push(`${rel}/${code}.json: missing key "${key}"`)
    for (const key of msgs.keys())
      if (!ref.has(key)) problems.push(`${rel}/${code}.json: extra key "${key}"`)
    for (const [key, value] of msgs) {
      if (!value.trim()) problems.push(`${rel}/${code}.json: empty message "${key}"`)
      baseCompile(value, {
        onError: (err) =>
          problems.push(`${rel}/${code}.json: "${key}" does not compile (${err.message})`),
      })
    }
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} translation problem(s):\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(
  `✓ ${dirs.length} message folders, locales: ${locales.join(', ')} — all keys match and compile`,
)
