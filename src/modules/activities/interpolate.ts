/**
 * Builds a configuration for a continuous difficulty from 5 anchor levels.
 * Numeric fields are linearly interpolated between the two neighbouring
 * levels (rounded for integer fields); other fields come from the nearest one.
 */
export function interpolateLevels<C extends Record<string, unknown>>(
  levels: readonly C[],
  difficulty: number,
  integerKeys: readonly (keyof C)[] = [],
  /** Numeric fields that only take the anchor values (e.g. grid sizes). */
  discreteKeys: readonly (keyof C)[] = [],
): C {
  if (!levels.length) throw new Error('no levels')
  const d = Math.min(levels.length, Math.max(1, difficulty))
  const loIdx = Math.floor(d) - 1
  const hiIdx = Math.min(levels.length - 1, loIdx + 1)
  const f = d - Math.floor(d)
  const lo = levels[loIdx]!
  const hi = levels[hiIdx]!
  const nearest = f < 0.5 ? lo : hi
  const out: Record<string, unknown> = { ...nearest }
  for (const key of Object.keys(lo)) {
    const a = lo[key]
    const b = hi[key]
    if (typeof a === 'number' && typeof b === 'number' && !discreteKeys.includes(key as keyof C)) {
      const v = a + (b - a) * f
      out[key] = integerKeys.includes(key as keyof C) ? Math.round(v) : Math.round(v * 1000) / 1000
    }
  }
  return out as C
}
