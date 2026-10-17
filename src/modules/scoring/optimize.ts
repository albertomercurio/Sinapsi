export interface NelderMeadResult {
  x: number[]
  fx: number
  iterations: number
  converged: boolean
}

/** Derivative-free minimizer (Nelder & Mead, 1965) with standard coefficients. */
export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  opts: { step?: number[]; maxIter?: number; tol?: number } = {},
): NelderMeadResult {
  const n = x0.length
  const maxIter = opts.maxIter ?? 1000 * n
  const tol = opts.tol ?? 1e-8
  const step = opts.step ?? x0.map((v) => (v !== 0 ? 0.1 * Math.abs(v) : 0.1))
  const safe = (x: number[]) => {
    const v = f(x)
    return Number.isFinite(v) ? v : Number.MAX_VALUE
  }

  let simplex: { x: number[]; fx: number }[] = [{ x: x0.slice(), fx: safe(x0) }]
  for (let i = 0; i < n; i++) {
    const x = x0.slice()
    x[i]! += step[i]!
    simplex.push({ x, fx: safe(x) })
  }

  let iter = 0
  let converged = false
  for (; iter < maxIter; iter++) {
    simplex.sort((a, b) => a.fx - b.fx)
    const best = simplex[0]!
    const worst = simplex[n]!
    if (Math.abs(worst.fx - best.fx) <= tol * (Math.abs(best.fx) + tol)) {
      converged = true
      break
    }
    const centroid: number[] = Array.from({ length: n }, () => 0)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) centroid[j] = centroid[j]! + simplex[i]!.x[j]! / n
    const along = (t: number) => centroid.map((c, j) => c + t * (worst.x[j]! - c))

    const xr = along(-1)
    const fr = safe(xr)
    if (fr < best.fx) {
      const xe = along(-2)
      const fe = safe(xe)
      simplex[n] = fe < fr ? { x: xe, fx: fe } : { x: xr, fx: fr }
    } else if (fr < simplex[n - 1]!.fx) {
      simplex[n] = { x: xr, fx: fr }
    } else {
      const outside = fr < worst.fx
      const xc = along(outside ? -0.5 : 0.5)
      const fc = safe(xc)
      if (fc < (outside ? fr : worst.fx)) {
        simplex[n] = { x: xc, fx: fc }
      } else {
        simplex = simplex.map((p, i) => {
          if (i === 0) return p
          const x = p.x.map((v, j) => best.x[j]! + 0.5 * (v - best.x[j]!))
          return { x, fx: safe(x) }
        })
      }
    }
  }
  simplex.sort((a, b) => a.fx - b.fx)
  return { x: simplex[0]!.x, fx: simplex[0]!.fx, iterations: iter, converged }
}
