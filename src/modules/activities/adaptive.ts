import {
  type Ability,
  inflate,
  initialAbility,
  nextDifficulty,
  updateAbility,
} from '@/modules/scoring'

export interface StoredAbility {
  rating: number
  rd: number
  n_runs: number
  locked: boolean
  locked_difficulty: number | null
  last_run_at: string | null
}

export interface DifficultyChoice {
  difficulty: number
  source: 'locked' | 'fixed' | 'adaptive' | 'initial'
  ability: Ability
}

function daysSince(iso: string | null, now: Date): number {
  if (!iso) return 0
  return Math.max(0, (now.getTime() - new Date(iso).getTime()) / 86_400_000)
}

/**
 * Decides the difficulty of the next run: a therapist lock on the patient ×
 * activity wins, then a fixed difficulty on the session item, otherwise the
 * Glicko engine targets the patient's success probability (default 75%).
 */
export function chooseDifficulty(opts: {
  stored: StoredAbility | null
  itemDifficulty: number | null
  itemLocked: boolean
  targetSuccess: number
  now?: Date
}): DifficultyChoice {
  const now = opts.now ?? new Date()
  const base: Ability = opts.stored
    ? inflate(
        { rating: Number(opts.stored.rating), rd: Number(opts.stored.rd) },
        daysSince(opts.stored.last_run_at, now),
      )
    : initialAbility()

  if (opts.stored?.locked && opts.stored.locked_difficulty) {
    return { difficulty: Number(opts.stored.locked_difficulty), source: 'locked', ability: base }
  }
  if (opts.itemDifficulty !== null && (opts.itemLocked || !opts.stored)) {
    return { difficulty: opts.itemDifficulty, source: 'fixed', ability: base }
  }
  if (!opts.stored && opts.itemDifficulty === null) {
    return {
      difficulty: nextDifficulty(base, opts.targetSuccess),
      source: 'initial',
      ability: base,
    }
  }
  return { difficulty: nextDifficulty(base, opts.targetSuccess), source: 'adaptive', ability: base }
}

/** New rating after a run at `difficulty` with graded `performance` ∈ [0, 1]. */
export function abilityAfterRun(before: Ability, difficulty: number, performance: number) {
  return updateAbility(before, difficulty, performance)
}
