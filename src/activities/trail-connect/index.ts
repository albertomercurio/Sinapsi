import { defineActivity } from '@/modules/activities/types'
import { configFor, configSchema, generate, score, type Config, type Instance } from './logic'

export default defineActivity<Config, Instance>({
  id: 'trail-connect',
  version: 1,
  scoringVersion: 2,
  icon: '🔗',
  domains: ['executive.flexibility', 'speed', 'visuospatial', 'attention.alternating'],
  ageGroups: ['child', 'adult', 'senior'],
  formats: ['digital', 'paper'],
  languageDependent: false,
  minTrials: 1,
  estimatedMinutes: 3,
  configSchema,
  configFor,
  generate: ({ rng, config, ageGroup }) => generate(rng, config, ageGroup),
  score: (instance, rec) => score(instance, rec),
  metrics: [
    { key: 'timeA', unit: 'seconds', polarity: -1, primary: true },
    { key: 'timeB', unit: 'seconds', polarity: -1, primary: true },
    { key: 'bMinusA', unit: 'seconds', polarity: -1, primary: true },
    { key: 'bOverA', unit: 'ratio', polarity: -1 },
    { key: 'errorsA', unit: 'count', polarity: -1 },
    { key: 'errorsB', unit: 'count', polarity: -1 },
    { key: 'pauses', unit: 'count', polarity: -1 },
    { key: 'pathEfficiency', unit: 'ratio', polarity: 1 },
    { key: 'medianLinkA', unit: 'ms', polarity: -1 },
    { key: 'medianLinkB', unit: 'ms', polarity: -1 },
    { key: 'holdMedian', unit: 'ms', polarity: 0 },
  ],
  player: () => import('./Player.vue'),
  print: () => import('./Print.vue'),
})
