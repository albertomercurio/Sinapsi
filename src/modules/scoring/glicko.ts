import { clamp } from './stats'

/**
 * Adaptive ability tracking with a Glicko-1 rating system (Glickman, 1999),
 * the uncertainty-aware successor of Elo used by adaptive practice systems such
 * as Math Garden (Klinkenberg, Straatemeier & van der Maas, 2011).
 *
 * Each run is a "match" between the patient (rating r, deviation RD) and the
 * exercise (rating derived from its difficulty level). The outcome is the
 * graded performance in [0, 1] produced by the activity's scoring, which
 * already integrates speed and accuracy (signed residual time rule).
 *
 * Scale: one difficulty level = 200 rating points, level 3 = 1500. A patient
 * whose ability equals level L+1 is expected to succeed ~76% at level L.
 * RD shrinks with every run and grows again with inactivity, so ratings
 * re-adapt quickly after a break (e.g. after a holiday or a clinical change).
 */

export const RATING_PER_LEVEL = 200
export const CENTER_LEVEL = 3
export const CENTER_RATING = 1500
export const RD_INITIAL = 350
export const RD_MIN = 45
export const RD_MAX = 350
/** RD inflation per day of inactivity: back to RD_MAX from 50 in about a year. */
export const RD_DAILY_C = Math.sqrt((RD_MAX ** 2 - 50 ** 2) / 365)
/** Uncertainty attached to the exercise difficulty itself. */
export const ITEM_RD = 40

const Q = Math.log(10) / 400

export interface Ability {
  rating: number
  rd: number
}

export function levelToRating(level: number): number {
  return CENTER_RATING + (level - CENTER_LEVEL) * RATING_PER_LEVEL
}

export function ratingToLevel(rating: number): number {
  return CENTER_LEVEL + (rating - CENTER_RATING) / RATING_PER_LEVEL
}

function g(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI))
}

/** Expected performance of a patient with `rating` on an exercise at `difficulty`. */
export function expectedOutcome(rating: number, difficulty: number, itemRd = ITEM_RD): number {
  return 1 / (1 + 10 ** ((-g(itemRd) * (rating - levelToRating(difficulty))) / 400))
}

export function initialAbility(startLevel = 2.5): Ability {
  return { rating: levelToRating(startLevel), rd: RD_INITIAL }
}

/** Inflate RD for `days` of inactivity. */
export function inflate(ability: Ability, days: number): Ability {
  if (days <= 0) return ability
  return {
    rating: ability.rating,
    rd: Math.min(Math.sqrt(ability.rd ** 2 + RD_DAILY_C ** 2 * days), RD_MAX),
  }
}

/** Glicko-1 update after one run with graded outcome s ∈ [0, 1]. */
export function updateAbility(
  ability: Ability,
  difficulty: number,
  outcome: number,
): Ability & { expected: number } {
  const s = clamp(outcome, 0, 1)
  const gj = g(ITEM_RD)
  const e = expectedOutcome(ability.rating, difficulty)
  const d2 = 1 / (Q * Q * gj * gj * e * (1 - e))
  const denom = 1 / (ability.rd * ability.rd) + 1 / d2
  const rating = ability.rating + (Q / denom) * gj * (s - e)
  const rd = Math.max(Math.sqrt(1 / denom), RD_MIN)
  return { rating, rd, expected: e }
}

/**
 * Difficulty at which the expected success equals `target` (default 75%),
 * clamped to the playable range [1, 5].
 */
export function nextDifficulty(ability: Ability, target = 0.75): number {
  const t = clamp(target, 0.05, 0.95)
  const offset = (400 * Math.log10(t / (1 - t))) / g(ITEM_RD)
  return clamp(Math.round(ratingToLevel(ability.rating - offset) * 100) / 100, 1, 5)
}

/** Ability expressed in level units with a 95% interval, for charts. */
export function abilityAsLevel(ability: Ability): { level: number; lo: number; hi: number } {
  const level = ratingToLevel(ability.rating)
  const half = (1.96 * ability.rd) / RATING_PER_LEVEL
  return { level, lo: level - half, hi: level + half }
}
