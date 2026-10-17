import { mean, pearson } from './stats'

export interface Point {
  x: number
  y: number
}

/**
 * Center of Cancellation (Rorden & Karnath, 2010). Target positions are rescaled
 * so the leftmost target is −1 and the rightmost +1; the CoC is the mean
 * position of the cancelled targets minus the mean of all targets, so that
 * cancelling everything (or a balanced subset) gives 0. Negative values = the
 * cancelled targets are shifted to the left. Same on the vertical axis
 * (negative = top). Reported as spatial asymmetry, never as a diagnosis.
 */
export function centerOfCancellation(
  targets: readonly Point[],
  cancelled: readonly boolean[],
): { x: number | null; y: number | null } {
  const picked = targets.filter((_, i) => cancelled[i])
  if (!targets.length || !picked.length) return { x: null, y: null }
  const axis = (key: 'x' | 'y') => {
    const vals = targets.map((p) => p[key])
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    if (hi === lo) return 0
    const norm = (v: number) => (2 * (v - lo)) / (hi - lo) - 1
    return mean(picked.map((p) => norm(p[key])))! - mean(targets.map((p) => norm(p[key])))!
  }
  return { x: axis('x'), y: axis('y') }
}

/**
 * Search organization "best r" (Mark et al., 2004): the larger absolute Pearson
 * correlation between cancellation order and the x or y coordinate. Close to 1
 * = systematic row/column search.
 */
export function bestR(path: readonly Point[]): number | null {
  if (path.length < 3) return null
  const order = path.map((_, i) => i)
  const rx = pearson(
    order,
    path.map((p) => p.x),
  )
  const ry = pearson(
    order,
    path.map((p) => p.y),
  )
  if (rx === null || ry === null) return null
  return Math.max(Math.abs(rx), Math.abs(ry))
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/**
 * Intersection rate (Donnelly et al., 1999): number of crossings of the search
 * path with itself, divided by the number of cancellations. Lower = more organized.
 */
export function intersectionRate(path: readonly Point[]): number | null {
  if (path.length < 4) return path.length ? 0 : null
  let crossings = 0
  for (let i = 0; i < path.length - 1; i++) {
    for (let j = i + 2; j < path.length - 1; j++) {
      if (segmentsIntersect(path[i]!, path[i + 1]!, path[j]!, path[j + 1]!)) crossings++
    }
  }
  return crossings / path.length
}

/** Mean distance between consecutive cancellations, as a fraction of the stage diagonal. */
export function meanInterCancellationDistance(
  path: readonly Point[],
  diagonal: number,
): number | null {
  if (path.length < 2 || diagonal <= 0) return null
  let s = 0
  for (let i = 1; i < path.length; i++) {
    s += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y)
  }
  return s / (path.length - 1) / diagonal
}
