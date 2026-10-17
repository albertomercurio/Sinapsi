import { describeDevice, estimateRefreshRate } from './device'
import { movementSummary, normalizedDistance } from './kinematics'
import type {
  InputType,
  Interruption,
  PointerSample,
  ResponseRecord,
  RunRecording,
  TrialRecord,
} from './types'

export interface RecorderOptions {
  sampleHz?: number
  maxSamples?: number
}

/**
 * Captures everything a patient does during a run, with high-resolution
 * timestamps (performance.now / event.timeStamp share the same time origin):
 * stimulus onsets aligned to the actual paint, press and release times, input
 * type, pressure, precision and the pointer trajectory. Framework-agnostic so
 * it can be unit tested; activities use it through ActivityHost.
 */
export class TrialRecorder<S = unknown> {
  readonly trials: TrialRecord<S>[] = []
  private samples: PointerSample[] = []
  private interruptions: Interruption[] = []
  private inputs = new Set<InputType>()
  private open = new Map<number | string, ResponseRecord>()
  private t0 = 0
  private startedAt = new Date()
  private lastSampleT = -Infinity
  private hiddenSince: number | null = null
  private pausedSince: number | null = null
  private refreshHz: number | null = null
  private stage: HTMLElement | null = null
  private readonly sampleEvery: number
  private readonly maxSamples: number
  private lastResponseT = 0
  baseline: RunRecording['baseline']

  constructor(opts: RecorderOptions = {}) {
    this.sampleEvery = 1000 / (opts.sampleHz ?? 60)
    this.maxSamples = opts.maxSamples ?? 30000
  }

  /** ms since the run started. */
  now(): number {
    return performance.now() - this.t0
  }

  /** Converts an absolute DOM timestamp (event.timeStamp / rAF time) to run time. */
  rel(absolute: number): number {
    return absolute - this.t0
  }

  start(stage: HTMLElement) {
    this.stage = stage
    this.t0 = performance.now()
    this.startedAt = new Date()
    stage.addEventListener('pointermove', this.onMove, { passive: true })
    document.addEventListener('visibilitychange', this.onVisibility)
    void estimateRefreshRate().then((hz) => (this.refreshHz = hz))
  }

  stop() {
    this.stage?.removeEventListener('pointermove', this.onMove)
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  /** Stage-relative coordinates. */
  toStage(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.stage?.getBoundingClientRect()
    return r ? { x: clientX - r.left, y: clientY - r.top } : { x: clientX, y: clientY }
  }

  beginTrial(stimulus: S, extra?: Record<string, unknown>): TrialRecord<S> {
    const trial: TrialRecord<S> = {
      i: this.trials.length,
      stimulus,
      onset: null,
      responses: [],
      extra,
    }
    this.trials.push(trial)
    return trial
  }

  /** Resolves once the stimulus has actually been painted (double rAF). */
  markOnset(trial: TrialRecord<S>): Promise<number> {
    return new Promise((resolve) => {
      requestAnimationFrame(() =>
        requestAnimationFrame((t) => {
          trial.onset = this.rel(t)
          resolve(trial.onset)
        }),
      )
    })
  }

  /** Marks an onset at an explicit run time (used by tests and static layouts). */
  setOnset(trial: TrialRecord<S>, t = this.now()) {
    trial.onset = t
  }

  pointerDown(
    trial: TrialRecord<S>,
    e: PointerEvent,
    info: { target?: string | number | null; targetEl?: Element | null } = {},
  ): ResponseRecord {
    const input = (e.pointerType || 'mouse') as InputType
    this.inputs.add(input)
    const t = this.rel(e.timeStamp)
    const { x, y } = this.toStage(e.clientX, e.clientY)
    const resp: ResponseRecord = {
      t,
      x: Math.round(x),
      y: Math.round(y),
      input,
      target: info.target ?? null,
    }
    if (e.pressure && e.pointerType === 'pen') resp.pressure = Math.round(e.pressure * 100) / 100
    if (info.targetEl && this.stage) {
      const r = info.targetEl.getBoundingClientRect()
      const s = this.stage.getBoundingClientRect()
      resp.distNorm =
        Math.round(
          normalizedDistance(x, y, {
            x: r.left - s.left,
            y: r.top - s.top,
            width: r.width,
            height: r.height,
          }) * 100,
        ) / 100
    }
    const from = Math.max(trial.onset ?? 0, this.lastResponseT)
    resp.movement = movementSummary(this.samples, from, { t, x, y })
    this.lastResponseT = t
    this.addResponse(trial, resp)
    this.open.set(e.pointerId, resp)
    return resp
  }

  pointerUp(e: PointerEvent) {
    const resp = this.open.get(e.pointerId)
    if (!resp) return
    resp.up = this.rel(e.timeStamp)
    resp.holdMs = Math.round(resp.up - resp.t)
    this.open.delete(e.pointerId)
  }

  keyDown(
    trial: TrialRecord<S>,
    e: KeyboardEvent,
    target?: string | number | null,
  ): ResponseRecord | null {
    if (e.repeat) return null
    this.inputs.add('keyboard')
    const resp: ResponseRecord = {
      t: this.rel(e.timeStamp),
      input: 'keyboard',
      key: e.key,
      target: target ?? null,
    }
    this.lastResponseT = resp.t
    this.addResponse(trial, resp)
    this.open.set(`key:${e.code}`, resp)
    return resp
  }

  keyUp(e: KeyboardEvent) {
    const resp = this.open.get(`key:${e.code}`)
    if (!resp) return
    resp.up = this.rel(e.timeStamp)
    resp.holdMs = Math.round(resp.up - resp.t)
    this.open.delete(`key:${e.code}`)
  }

  /** Records a response that did not come from a DOM event (tests, simulations). */
  addResponse(trial: TrialRecord<S>, resp: ResponseRecord) {
    trial.responses.push(resp)
    if (trial.rt === undefined || trial.rt === null) {
      trial.rt = trial.onset !== null ? Math.round(resp.t - trial.onset) : null
    }
  }

  endTrial(
    trial: TrialRecord<S>,
    result: { correct?: boolean; flags?: string[]; extra?: Record<string, unknown> },
  ) {
    if (result.correct !== undefined) trial.correct = result.correct
    if (result.flags?.length) trial.flags = [...(trial.flags ?? []), ...result.flags]
    if (result.extra) trial.extra = { ...trial.extra, ...result.extra }
    if (trial.rt === undefined) trial.rt = null
  }

  /** Drops warm-up trials (motor baseline) so the task trials start at index 0. */
  clearTrials() {
    this.trials.splice(0, this.trials.length)
  }

  setBaseline(rts: number[], median: number | null) {
    this.baseline = { median, rts }
  }

  pause() {
    this.pausedSince ??= this.now()
  }

  resume() {
    if (this.pausedSince === null) return
    this.interruptions.push({
      t: this.pausedSince,
      type: 'pause',
      durationMs: Math.round(this.now() - this.pausedSince),
    })
    this.pausedSince = null
  }

  finish(): RunRecording<S> {
    this.stop()
    this.resume()
    const r = this.stage?.getBoundingClientRect()
    return {
      startedAt: this.startedAt.toISOString(),
      durationMs: Math.round(this.now()),
      trials: this.trials,
      samples: this.samples,
      interruptions: this.interruptions,
      device: describeDevice(this.inputs, this.refreshHz),
      stage: { width: Math.round(r?.width ?? 0), height: Math.round(r?.height ?? 0) },
      baseline: this.baseline,
    }
  }

  private onMove = (e: PointerEvent) => {
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e]
    for (const ev of events.length ? events : [e]) {
      const t = this.rel(ev.timeStamp)
      if (t - this.lastSampleT < this.sampleEvery || this.samples.length >= this.maxSamples)
        continue
      const { x, y } = this.toStage(ev.clientX, ev.clientY)
      this.samples.push({ t: Math.round(t), x: Math.round(x), y: Math.round(y) })
      this.lastSampleT = t
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      this.hiddenSince = this.now()
    } else if (this.hiddenSince !== null) {
      this.interruptions.push({
        t: this.hiddenSince,
        type: 'hidden',
        durationMs: Math.round(this.now() - this.hiddenSince),
      })
      this.hiddenSince = null
    }
  }
}
