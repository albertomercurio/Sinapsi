import type { ActivityDefinition } from './types'
import type { AgeGroup, CognitiveDomain } from './taxonomy'

/** Every folder in src/activities is an activity plugin (eager: manifests only, players are lazy). */
const modules = import.meta.glob<{ default: ActivityDefinition }>('/src/activities/*/index.ts', {
  eager: true,
})

export const activities: ActivityDefinition[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))

const byId = new Map(activities.map((a) => [a.id, a]))

export function getActivity(id: string): ActivityDefinition | undefined {
  return byId.get(id)
}

export function filterActivities(f: {
  domain?: CognitiveDomain | null
  ageGroup?: AgeGroup | null
  format?: string | null
  q?: string
  label?: (a: ActivityDefinition) => string
}) {
  const q = f.q?.trim().toLowerCase()
  return activities.filter(
    (a) =>
      (!f.domain ||
        a.domains.includes(f.domain) ||
        a.domains.some((d) => d.startsWith(`${f.domain}.`))) &&
      (!f.ageGroup || a.ageGroups.includes(f.ageGroup)) &&
      (!f.format || a.formats.includes(f.format as never)) &&
      (!q || (f.label?.(a) ?? a.id).toLowerCase().includes(q)),
  )
}
