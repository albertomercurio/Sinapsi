import type { MovementSummary, PointerSample } from './types'

const START_THRESHOLD_PX = 4
const PAUSE_SPEED = 0.02 // px/ms ≈ 20 px/s
const PAUSE_MIN_MS = 200

/**
 * Kinematic summary of the pointer path between a reference time (stimulus
 * onset or previous response) and a response. Works on mouse/pen hover samples
 * and on touch drags; returns zeros when no samples are available (taps).
 */
export function movementSummary(
  samples: readonly PointerSample[],
  from: number,
  to: { t: number; x: number; y: number },
): MovementSummary {
  const pts = samples.filter((s) => s.t >= from && s.t <= to.t)
  pts.push({ t: to.t, x: to.x, y: to.y })
  const empty: MovementSummary = {
    initiationMs: null,
    movementMs: null,
    pathLength: 0,
    straightDistance: 0,
    efficiency: null,
    peaks: 0,
    pauses: 0,
    reversals: 0,
    peakSpeed: null,
  }
  if (pts.length < 3) return empty

  const start = pts[0]!
  let startIdx = pts.findIndex((p) => Math.hypot(p.x - start.x, p.y - start.y) > START_THRESHOLD_PX)
  if (startIdx < 0) return { ...empty, initiationMs: null }
  startIdx = Math.max(1, startIdx)
  const moveStart = pts[startIdx - 1]!

  let path = 0
  const speeds: { t: number; v: number; proj: number }[] = []
  const axis = { x: to.x - start.x, y: to.y - start.y }
  const axisLen = Math.hypot(axis.x, axis.y) || 1
  for (let i = startIdx; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    path += d
    const dt = Math.max(1, b.t - a.t)
    const proj = ((b.x - a.x) * axis.x + (b.y - a.y) * axis.y) / axisLen
    speeds.push({ t: b.t, v: d / dt, proj: proj / dt })
  }

  // 3-point moving average of speed.
  const smooth = speeds.map((s, i) => {
    const w = speeds.slice(Math.max(0, i - 1), i + 2)
    return { ...s, v: w.reduce((acc, x) => acc + x.v, 0) / w.length }
  })
  const peakSpeed = smooth.reduce((m, s) => Math.max(m, s.v), 0)

  // Sub-movements: local maxima above 20% of the peak, separated by a dip below 50% of the smaller peak.
  let peaks = 0
  let lastPeak = 0
  let dipSinceLast = true
  for (let i = 1; i < smooth.length - 1; i++) {
    const v = smooth[i]!.v
    if (lastPeak > 0 && v < 0.5 * lastPeak) dipSinceLast = true
    if (v >= smooth[i - 1]!.v && v > smooth[i + 1]!.v && v > 0.2 * peakSpeed && dipSinceLast) {
      peaks++
      lastPeak = v
      dipSinceLast = false
    }
  }
  if (peaks === 0 && peakSpeed > 0) peaks = 1

  let pauses = 0
  let slowSince: number | null = null
  for (const s of smooth) {
    if (s.v < PAUSE_SPEED) {
      slowSince ??= s.t
    } else {
      if (slowSince !== null && s.t - slowSince >= PAUSE_MIN_MS) pauses++
      slowSince = null
    }
  }

  let reversals = 0
  let lastSign = 0
  for (const s of smooth) {
    if (Math.abs(s.proj) < PAUSE_SPEED) continue
    const sign = Math.sign(s.proj)
    if (lastSign !== 0 && sign !== lastSign) reversals++
    lastSign = sign
  }

  const straight = Math.hypot(to.x - start.x, to.y - start.y)
  return {
    initiationMs: moveStart.t - from,
    movementMs: to.t - moveStart.t,
    pathLength: Math.round(path),
    straightDistance: Math.round(straight),
    efficiency: path > 0 ? Math.min(1, straight / path) : null,
    peaks,
    pauses,
    reversals,
    peakSpeed: peakSpeed || null,
  }
}

/** Distance from a target's centre, normalized by its radius (half the smaller side). */
export function normalizedDistance(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number },
) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const r = Math.min(rect.width, rect.height) / 2 || 1
  return Math.hypot(x - cx, y - cy) / r
}
