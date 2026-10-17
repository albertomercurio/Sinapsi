import { defineActivity } from '@/modules/activities/types'
import { configFor, configSchema, generate, score, type Config, type Instance } from './logic'

export default defineActivity<Config, Instance>({
  id: 'categorization',
  version: 1,
  scoringVersion: 1,
  icon: '🗂️',
  domains: ['memory.semantic', 'executive.flexibility', 'language'],
  ageGroups: ['child', 'adult', 'senior'],
  formats: ['digital'],
  languageDependent: true,
  estimatedMinutes: 3,
  configSchema,
  configFor,
  generate: ({ rng, config, content, ageGroup }) => generate(rng, config, content, ageGroup),
  score: (instance, rec, { config }) => score(instance, rec, config),
  metrics: [
    { key: 'accuracy', unit: 'percent', polarity: 1, primary: true },
    { key: 'medianRt', unit: 'ms', polarity: -1, primary: true },
    { key: 'perseverativeErrors', unit: 'count', polarity: -1, primary: true },
    { key: 'switchCostRt', unit: 'ms', polarity: -1 },
    { key: 'switchCostAccuracy', unit: 'ratio', polarity: -1 },
    { key: 'errors', unit: 'count', polarity: -1 },
    { key: 'timeouts', unit: 'count', polarity: -1 },
    { key: 'rtCv', unit: 'ratio', polarity: -1 },
    { key: 'holdMedian', unit: 'ms', polarity: 0 },
  ],
  player: () => import('./Player.vue'),
})
