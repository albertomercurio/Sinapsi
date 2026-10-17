import type { LocaleCode } from './locales'

type MessageTree = { [key: string]: unknown }
type Loader = () => Promise<{ default: MessageTree }>

/**
 * Every `locales/<code>.json` in the app, precompiled at build time by
 * @intlify/unplugin-vue-i18n. Files are namespaced by where they live:
 *   src/locales/it.json                    → root keys        (`common.save`)
 *   src/modules/<id>/locales/it.json       → `<id>.*`         (`patients.title`)
 *   src/activities/<id>/locales/it.json    → `activity.<id>.*`
 */
const files = import.meta.glob<{ default: MessageTree }>('/src/**/locales/*.json')

export function namespaceFor(path: string): string[] {
  const mod = path.match(/^\/src\/modules\/([^/]+)\/locales\//)
  if (mod) return [mod[1]!]
  const act = path.match(/^\/src\/activities\/([^/]+)\/locales\//)
  if (act) return ['activity', act[1]!]
  return []
}

export function deepMerge(target: MessageTree, source: MessageTree): MessageTree {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object'
    ) {
      deepMerge(existing as MessageTree, value as MessageTree)
    } else {
      target[key] = value
    }
  }
  return target
}

export function nest(path: string[], value: MessageTree): MessageTree {
  return path.reduceRight<MessageTree>((acc, key) => ({ [key]: acc }), value)
}

export async function loadMessages(
  locale: LocaleCode,
  source: Record<string, Loader> = files,
): Promise<MessageTree> {
  const entries = Object.entries(source).filter(([path]) =>
    path.endsWith(`/locales/${locale}.json`),
  )
  const loaded = await Promise.all(
    entries.map(async ([path, load]) => [path, (await load()).default] as const),
  )
  const messages: MessageTree = {}
  for (const [path, tree] of loaded) {
    deepMerge(messages, nest(namespaceFor(path), tree))
  }
  return messages
}
