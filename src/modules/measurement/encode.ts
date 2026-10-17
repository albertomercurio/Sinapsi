import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import type { PointerSample, RunRecording } from './types'

export const EVENTS_ENCODING = 'deflate-json-v1'

/** Delta-encodes samples into a flat integer array: [t0,x0,y0, dt,dx,dy, ...]. */
function packSamples(samples: readonly PointerSample[]): number[] {
  const out: number[] = []
  let pt = 0
  let px = 0
  let py = 0
  for (const s of samples) {
    out.push(s.t - pt, s.x - px, s.y - py)
    pt = s.t
    px = s.x
    py = s.y
  }
  return out
}

function unpackSamples(flat: readonly number[]): PointerSample[] {
  const out: PointerSample[] = []
  let t = 0
  let x = 0
  let y = 0
  for (let i = 0; i + 2 < flat.length; i += 3) {
    t += flat[i]!
    x += flat[i + 1]!
    y += flat[i + 2]!
    out.push({ t, x, y })
  }
  return out
}

/** Compressed raw event log (typically 3–8 KB per run). */
export function packRecording(rec: RunRecording): Uint8Array {
  const { samples, ...rest } = rec
  const json = JSON.stringify({ v: 1, ...rest, samples: packSamples(samples) })
  return deflateSync(strToU8(json), { level: 9 })
}

export function unpackRecording<S = unknown>(bytes: Uint8Array): RunRecording<S> {
  const obj = JSON.parse(strFromU8(inflateSync(bytes)))
  const { v: _v, samples, ...rest } = obj
  return { ...rest, samples: unpackSamples(samples ?? []) } as RunRecording<S>
}

/** PostgREST transports bytea as a "\x…" hex string. */
export function toByteaHex(bytes: Uint8Array): string {
  let hex = '\\x'
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

export function fromByteaHex(hex: string): Uint8Array {
  const clean = hex.startsWith('\\x') ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}
