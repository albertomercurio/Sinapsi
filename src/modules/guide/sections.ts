/** Ids of the guide sections (src/modules/guide/content/<locale>.ts). */
export type GuideSectionId =
  | 'reading'
  | 'score'
  | 'ability'
  | 'areas'
  | 'trends'
  | 'reaction-times'
  | 'rt-distribution'
  | 'signal-detection'
  | 'speed-accuracy'
  | 'attention-time'
  | 'visual-search'
  | 'memory'
  | 'flexibility'
  | 'movement'
  | 'quality'
  | 'limits'

const BY_SECTION: Record<GuideSectionId, string[]> = {
  reading: [],
  score: ['score', 'performance', 'accuracy', 'durationS'],
  ability: ['ability'],
  areas: [],
  trends: [],
  'reaction-times': [
    'medianRt',
    'meanRt',
    'rtCv',
    'anticipations',
    'baselineRt',
    'decisionTime',
    'holdMedian',
    'responseLatency',
    'interTapMedian',
  ],
  'rt-distribution': ['exgMu', 'exgSigma', 'exgTau'],
  'signal-detection': ['hits', 'omissions', 'commissions', 'commissionRate', 'dPrime', 'criterion'],
  'speed-accuracy': [],
  'attention-time': ['postErrorSlowing', 'vigilanceRtSlope', 'fatigueIndex'],
  'visual-search': [
    'targets',
    'hitRate',
    'cancellationsPerMin',
    'cocX',
    'cocY',
    'leftOmissions',
    'rightOmissions',
    'bestR',
    'intersectionRate',
    'meanDistance',
    'firstMarkX',
    'medianInterval',
    'selfCorrections',
  ],
  memory: [
    'pairs',
    'matched',
    'attempts',
    'efficiency',
    'efficiencyVsOptimal',
    'memoryErrors',
    'perseverations',
    'secondsPerPair',
    'medianFlipInterval',
    'pcuScore',
    'maxSpan',
    'spanEstimate',
    'correctTrials',
    'itemErrors',
    'orderErrors',
    'firstPositionAccuracy',
    'lastPositionAccuracy',
    'backward',
    'digits',
  ],
  flexibility: [
    'errors',
    'timeouts',
    'perseverativeErrors',
    'switchCostRt',
    'switchCostAccuracy',
    'timeA',
    'timeB',
    'errorsA',
    'errorsB',
    'bMinusA',
    'bOverA',
    'medianLinkA',
    'medianLinkB',
    'pauses',
  ],
  movement: ['pathEfficiency'],
  quality: [],
  limits: [],
}

const METRIC_SECTION = new Map<string, GuideSectionId>(
  (Object.entries(BY_SECTION) as [GuideSectionId, string[]][]).flatMap(([id, keys]) =>
    keys.map((k) => [k, id] as const),
  ),
)

/** Guide section that explains a metric (by MetricDescriptor key). */
export function metricGuideSection(key: string): GuideSectionId | undefined {
  return METRIC_SECTION.get(key)
}

export const GUIDE_SECTION_IDS = Object.keys(BY_SECTION) as GuideSectionId[]
