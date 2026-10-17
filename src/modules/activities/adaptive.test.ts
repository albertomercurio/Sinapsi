import { describe, expect, it } from 'vitest'
import { abilityAfterRun, chooseDifficulty } from './adaptive'
import { interpolateLevels } from './interpolate'
import { levelToRating } from '@/modules/scoring'

describe('chooseDifficulty', () => {
  it('starts new patients below the middle of the scale', () => {
    const c = chooseDifficulty({
      stored: null,
      itemDifficulty: null,
      itemLocked: false,
      targetSuccess: 0.75,
    })
    expect(c.source).toBe('initial')
    expect(c.difficulty).toBeGreaterThanOrEqual(1)
    expect(c.difficulty).toBeLessThan(2.5)
  })

  it('honours a therapist lock over everything else', () => {
    const c = chooseDifficulty({
      stored: {
        rating: 1800,
        rd: 60,
        n_runs: 10,
        locked: true,
        locked_difficulty: 2,
        last_run_at: null,
      },
      itemDifficulty: 4,
      itemLocked: true,
      targetSuccess: 0.75,
    })
    expect(c).toMatchObject({ difficulty: 2, source: 'locked' })
  })

  it('uses a locked item difficulty, otherwise adapts', () => {
    const stored = {
      rating: levelToRating(4),
      rd: 60,
      n_runs: 10,
      locked: false,
      locked_difficulty: null,
      last_run_at: null,
    }
    expect(
      chooseDifficulty({ stored, itemDifficulty: 1.5, itemLocked: true, targetSuccess: 0.75 })
        .difficulty,
    ).toBe(1.5)
    const adaptive = chooseDifficulty({
      stored,
      itemDifficulty: 1.5,
      itemLocked: false,
      targetSuccess: 0.75,
    })
    expect(adaptive.source).toBe('adaptive')
    expect(adaptive.difficulty).toBeGreaterThan(2.8)
    expect(adaptive.difficulty).toBeLessThan(3.3)
  })

  it('inflates uncertainty after a long break', () => {
    const stored = {
      rating: 1500,
      rd: 60,
      n_runs: 30,
      locked: false,
      locked_difficulty: null,
      last_run_at: '2026-01-01T00:00:00Z',
    }
    const c = chooseDifficulty({
      stored,
      itemDifficulty: null,
      itemLocked: false,
      targetSuccess: 0.75,
      now: new Date('2026-07-01T00:00:00Z'),
    })
    expect(c.ability.rd).toBeGreaterThan(200)
  })

  it('moves the rating up after a strong run', () => {
    const after = abilityAfterRun({ rating: 1500, rd: 200 }, 3, 0.95)
    expect(after.rating).toBeGreaterThan(1500)
    expect(after.rd).toBeLessThan(200)
  })
})

describe('interpolateLevels', () => {
  const levels = [
    { n: 4, t: 1000, mode: 'a' },
    { n: 6, t: 800, mode: 'a' },
    { n: 8, t: 600, mode: 'b' },
    { n: 10, t: 500, mode: 'b' },
    { n: 12, t: 400, mode: 'c' },
  ]
  it('returns anchors at integer levels and interpolates between', () => {
    expect(interpolateLevels(levels, 1)).toEqual(levels[0])
    expect(interpolateLevels(levels, 5)).toEqual(levels[4])
    const mid = interpolateLevels(levels, 2.5, ['n'])
    expect(mid.n).toBe(7)
    expect(mid.t).toBe(700)
    expect(mid.mode).toBe('b')
  })
  it('keeps discrete numeric fields on anchor values', () => {
    const grid = [{ g: 9 }, { g: 9 }, { g: 9 }, { g: 16 }, { g: 16 }]
    expect(interpolateLevels(grid, 3.4, [], ['g']).g).toBe(9)
    expect(interpolateLevels(grid, 3.6, [], ['g']).g).toBe(16)
  })

  it('clamps out-of-range difficulties', () => {
    expect(interpolateLevels(levels, 0)).toEqual(levels[0])
    expect(interpolateLevels(levels, 9)).toEqual(levels[4])
  })
})
