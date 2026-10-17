/**
 * Cognitive domains (labels in locales under `activities.domains.*`).
 * Ids are stable: they are stored with sessions/templates and used for trends.
 */
export const DOMAIN_GROUPS = [
  { id: 'orientation', domains: ['orientation'] },
  {
    id: 'attention',
    domains: [
      'attention.sustained',
      'attention.selective',
      'attention.alternating',
      'attention.divided',
    ],
  },
  {
    id: 'memory',
    domains: [
      'memory.working',
      'memory.episodic',
      'memory.semantic',
      'memory.visual',
      'memory.verbal',
    ],
  },
  {
    id: 'executive',
    domains: [
      'executive.planning',
      'executive.inhibition',
      'executive.flexibility',
      'executive.reasoning',
    ],
  },
  { id: 'language', domains: ['language'] },
  { id: 'praxis', domains: ['praxis'] },
  { id: 'gnosis', domains: ['gnosis'] },
  { id: 'visuospatial', domains: ['visuospatial'] },
  { id: 'speed', domains: ['speed'] },
  { id: 'calculation', domains: ['calculation'] },
  { id: 'social', domains: ['social'] },
  { id: 'adl', domains: ['adl'] },
] as const

export type DomainGroupId = (typeof DOMAIN_GROUPS)[number]['id']
export type CognitiveDomain = (typeof DOMAIN_GROUPS)[number]['domains'][number]

export function groupOf(domain: CognitiveDomain): DomainGroupId {
  return DOMAIN_GROUPS.find((g) => (g.domains as readonly string[]).includes(domain))!.id
}

export type AgeGroup = 'child' | 'adult' | 'senior'

/** Age group from birth year (child < 14, senior ≥ 65). */
export function ageGroupFor(birthYear: number | null | undefined, now = new Date()): AgeGroup {
  if (!birthYear) return 'adult'
  const age = now.getFullYear() - birthYear
  if (age < 14) return 'child'
  if (age >= 65) return 'senior'
  return 'adult'
}

/** Clinical condition categories (labels under `patients.conditions.*`). */
export const CONDITION_CATEGORIES = [
  'neuro.stroke',
  'neuro.tbi',
  'neuro.tumor',
  'neuro.ms',
  'neuro.parkinson',
  'neuro.epilepsy',
  'neuro.other',
  'dementia.mci',
  'dementia.alzheimer',
  'dementia.vascular',
  'dementia.ftd',
  'dementia.lewy',
  'dev.adhd',
  'dev.sld',
  'dev.dld',
  'dev.asd',
  'dev.id',
  'dev.dcd',
  'psy.schizophrenia',
  'psy.mood',
  'psy.other',
  'aging.healthy',
  'other',
] as const
export type ConditionCategory = (typeof CONDITION_CATEGORIES)[number]
