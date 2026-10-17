import { defineActivity } from '@/modules/activities/types'
import { configFor, configSchema, generate, score, type Config, type Instance } from './logic'

export default defineActivity<Config, Instance>({
  id: 'span-sequence',
  version: 1,
  scoringVersion: 2,
  icon: '🔢',
  domains: ['memory.working', 'memory.visual', 'attention.sustained'],
  ageGroups: ['child', 'adult', 'senior'],
  formats: ['digital'],
  languageDependent: false,
  estimatedMinutes: 4,
  configSchema,
  configFor,
  generate: ({ rng, config }) => generate(rng, config),
  score: (instance, rec, { config }) => score(instance, rec, config),
  metrics: [
    { key: 'spanEstimate', unit: 'span', polarity: 1, primary: true },
    { key: 'pcuScore', unit: 'percent', polarity: 1, primary: true },
    { key: 'maxSpan', unit: 'span', polarity: 1, primary: true },
    { key: 'orderErrors', unit: 'count', polarity: -1 },
    { key: 'itemErrors', unit: 'count', polarity: -1 },
    { key: 'firstPositionAccuracy', unit: 'percent', polarity: 1 },
    { key: 'lastPositionAccuracy', unit: 'percent', polarity: 1 },
    { key: 'responseLatency', unit: 'ms', polarity: -1 },
    { key: 'interTapMedian', unit: 'ms', polarity: -1 },
    { key: 'holdMedian', unit: 'ms', polarity: 0 },
  ],
  player: () => import('./Player.vue'),
})
