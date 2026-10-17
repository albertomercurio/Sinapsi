import { createRng } from '@/shared/lib/rng'
import { defineActivity } from '@/modules/activities/types'
import { configFor, configSchema, generate, score, type Config, type Instance } from './logic'

export default defineActivity<Config, Instance>({
  id: 'go-no-go',
  version: 1,
  scoringVersion: 1,
  icon: '🚦',
  domains: ['executive.inhibition', 'attention.sustained', 'speed'],
  ageGroups: ['child', 'adult', 'senior'],
  formats: ['digital'],
  languageDependent: false,
  needsMotorBaseline: true,
  estimatedMinutes: 3,
  configSchema,
  configFor,
  generate: ({ rng, config }) => generate(rng ?? createRng(1), config),
  score: (instance, rec, { config, baselineRt }) => score(instance, rec, config, baselineRt),
  metrics: [
    { key: 'dPrime', unit: 'index', polarity: 1, primary: true },
    { key: 'commissions', unit: 'count', polarity: -1, primary: true },
    { key: 'medianRt', unit: 'ms', polarity: -1, primary: true },
    { key: 'rtCv', unit: 'ratio', polarity: -1 },
    { key: 'exgTau', unit: 'ms', polarity: -1 },
    { key: 'omissions', unit: 'count', polarity: -1 },
    { key: 'criterion', unit: 'index', polarity: 0 },
    { key: 'decisionTime', unit: 'ms', polarity: -1 },
    { key: 'postErrorSlowing', unit: 'ms', polarity: 0 },
    { key: 'vigilanceRtSlope', unit: 'perMin', polarity: -1 },
    { key: 'holdMedian', unit: 'ms', polarity: 0 },
  ],
  player: () => import('./Player.vue'),
})
