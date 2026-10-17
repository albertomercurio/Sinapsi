import { defineActivity } from '@/modules/activities/types'
import { configFor, configSchema, generate, score, type Config, type Instance } from './logic'

export default defineActivity<Config, Instance>({
  id: 'memory-pairs',
  version: 1,
  scoringVersion: 2,
  icon: '🃏',
  domains: ['memory.visual', 'memory.working', 'attention.selective'],
  ageGroups: ['child', 'adult', 'senior'],
  formats: ['digital'],
  languageDependent: false,
  minTrials: 2,
  estimatedMinutes: 3,
  configSchema,
  configFor,
  generate: ({ rng, config, content, ageGroup }) => generate(rng, config, content, ageGroup),
  score: (instance, rec) => score(instance, rec),
  metrics: [
    { key: 'efficiencyVsOptimal', unit: 'percent', polarity: 1, primary: true },
    { key: 'efficiency', unit: 'ratio', polarity: 1 },
    { key: 'memoryErrors', unit: 'count', polarity: -1, primary: true },
    { key: 'secondsPerPair', unit: 'seconds', polarity: -1, primary: true },
    { key: 'perseverations', unit: 'count', polarity: -1 },
    { key: 'attempts', unit: 'count', polarity: -1 },
    { key: 'medianFlipInterval', unit: 'ms', polarity: 0 },
    { key: 'holdMedian', unit: 'ms', polarity: 0 },
  ],
  player: () => import('./Player.vue'),
})
