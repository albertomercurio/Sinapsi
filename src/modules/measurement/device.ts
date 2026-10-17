import type { DeviceInfo, InputType } from './types'

/** Median frame interval over ~30 frames → refresh rate estimate (Hz). */
export function estimateRefreshRate(frames = 30): Promise<number | null> {
  if (typeof requestAnimationFrame === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const times: number[] = []
    const tick = (t: number) => {
      times.push(t)
      if (times.length > frames) {
        const deltas = times
          .slice(1)
          .map((v, i) => v - times[i]!)
          .sort((a, b) => a - b)
        const med = deltas[Math.floor(deltas.length / 2)]!
        resolve(med > 0 ? Math.round(1000 / med) : null)
      } else {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
    setTimeout(() => resolve(null), 2000)
  })
}

/** Coarse, non-identifying device description stored with each run. */
export function describeDevice(inputs: Set<InputType>, refreshHz: number | null): DeviceInfo {
  const input: DeviceInfo['input'] =
    inputs.size === 0 ? 'unknown' : inputs.size === 1 ? [...inputs][0]! : 'mixed'
  return {
    input,
    coarsePointer: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
    screenW: screen?.width ?? 0,
    screenH: screen?.height ?? 0,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    refreshHz,
  }
}
