export type InputType = 'mouse' | 'touch' | 'pen' | 'keyboard'

/** Pointer position sampled during a run. t = ms since run start; x/y = stage px. */
export interface PointerSample {
  t: number
  x: number
  y: number
}

export interface MovementSummary {
  /** Time from the reference point to the first movement > 4 px. */
  initiationMs: number | null
  /** Time from movement start to the response. */
  movementMs: number | null
  pathLength: number
  straightDistance: number
  /** Straight distance ÷ path length (1 = perfectly direct). */
  efficiency: number | null
  /** Speed peaks: each one a separate sub-movement (corrections). */
  peaks: number
  /** Stops longer than 200 ms while moving towards the target. */
  pauses: number
  /** Direction reversals along the start→end axis. */
  reversals: number
  peakSpeed: number | null
}

export interface ResponseRecord {
  /** Press time (pointerdown / keydown), ms since run start. */
  t: number
  /** Release time, ms since run start. */
  up?: number
  /** Press duration (hold time) in ms. */
  holdMs?: number
  x?: number
  y?: number
  input: InputType
  pressure?: number
  /** Id of the element hit, defined by the activity. */
  target?: string | number | null
  key?: string
  /** Distance from the target centre ÷ target radius (0 = centre, ≥1 = edge or outside). */
  distNorm?: number
  movement?: MovementSummary
}

export interface TrialRecord<S = unknown> {
  i: number
  stimulus: S
  /** Painted stimulus onset, ms since run start. */
  onset: number | null
  responses: ResponseRecord[]
  correct?: boolean
  /** First response time − onset. */
  rt?: number | null
  flags?: string[]
  extra?: Record<string, unknown>
}

export interface DeviceInfo {
  input: InputType | 'mixed' | 'unknown'
  coarsePointer: boolean
  screenW: number
  screenH: number
  viewportW: number
  viewportH: number
  dpr: number
  refreshHz: number | null
}

export interface Interruption {
  t: number
  type: 'hidden' | 'blur' | 'pause'
  durationMs: number
}

export interface RunRecording<S = unknown> {
  startedAt: string
  durationMs: number
  trials: TrialRecord<S>[]
  samples: PointerSample[]
  interruptions: Interruption[]
  device: DeviceInfo
  stage: { width: number; height: number }
  /** Simple reaction time warm-up (motor + device latency baseline). */
  baseline?: { median: number | null; rts: number[] }
}
