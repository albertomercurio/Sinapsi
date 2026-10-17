import { describe, expect, it } from 'vitest'
import { createRng, hashSeed } from './rng'

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const xs = Array.from({ length: 10 }, () => a.next())
    const ys = Array.from({ length: 10 }, () => b.next())
    expect(xs).toEqual(ys)
  })

  it('differs across seeds and forks', () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next())
    const r = createRng(7)
    expect(r.fork('a').next()).not.toEqual(r.fork('b').next())
  })

  it('produces roughly uniform and normal values', () => {
    const r = createRng(123)
    const n = 20000
    let sum = 0
    let sumN = 0
    let sumN2 = 0
    for (let i = 0; i < n; i++) {
      sum += r.next()
      const z = r.normal()
      sumN += z
      sumN2 += z * z
    }
    expect(sum / n).toBeCloseTo(0.5, 1)
    expect(sumN / n).toBeCloseTo(0, 1)
    expect(sumN2 / n).toBeCloseTo(1, 1)
  })

  it('shuffle keeps elements, int stays in range', () => {
    const r = createRng(5)
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 6)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(6)
    }
  })

  it('hashSeed is stable', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'))
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'))
  })
})
