/**
 * Small, fast, seedable PRNG (sfc32). Every generated exercise is a pure
 * function of its seed, so a run can be replayed and re-scored exactly.
 */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number
  /** Uniform in [min, max). */
  float(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
  /** k distinct items. */
  sample<T>(items: readonly T[], k: number): T[]
  bool(p?: number): boolean
  /** Standard normal (Box–Muller). */
  normal(mean?: number, sd?: number): number
  exponential(mean: number): number
  /** A child generator with an independent stream. */
  fork(label: string | number): Rng
  readonly seed: number
}

function sfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a |= 0
    b |= 0
    c |= 0
    d |= 0
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

/** 32-bit string/number hash (cyrb53-style mix, truncated). */
export function hashSeed(input: string | number): number {
  const s = String(input)
  let h1 = 0xdeadbeef ^ s.length
  let h2 = 0x41c6ce57 ^ s.length
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 ^ h2) >>> 0
}

export function randomSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! & 0x7fffffff
}

export function createRng(seed: number): Rng {
  const s = seed >>> 0
  const raw = sfc32(0x9e3779b9, 0x243f6a88, 0xb7e15162, s)
  for (let i = 0; i < 15; i++) raw() // warm-up
  let spare: number | null = null

  const rng: Rng = {
    seed: s,
    next: raw,
    int: (min, max) => min + Math.floor(raw() * (max - min + 1)),
    float: (min, max) => min + raw() * (max - min),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list')
      return items[Math.floor(raw() * items.length)]!
    },
    shuffle: (items) => {
      const a = items.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(raw() * (i + 1))
        ;[a[i], a[j]] = [a[j]!, a[i]!]
      }
      return a
    },
    sample: (items, k) => rng.shuffle(items).slice(0, Math.min(k, items.length)),
    bool: (p = 0.5) => raw() < p,
    normal: (mean = 0, sd = 1) => {
      if (spare !== null) {
        const v = spare
        spare = null
        return mean + sd * v
      }
      let u = 0
      let v = 0
      while (u === 0) u = raw()
      while (v === 0) v = raw()
      const mag = Math.sqrt(-2 * Math.log(u))
      spare = mag * Math.sin(2 * Math.PI * v)
      return mean + sd * mag * Math.cos(2 * Math.PI * v)
    },
    exponential: (mean) => {
      let u = 0
      while (u === 0) u = raw()
      return -mean * Math.log(u)
    },
    fork: (label) => createRng(hashSeed(`${s}:${label}`)),
  }
  return rng
}
