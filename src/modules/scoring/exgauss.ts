import { logNormCdf } from './normal'
import { finite, mean, sd, skewness } from './stats'
import { nelderMead } from './optimize'

/**
 * Ex-Gaussian model of reaction times: a Gaussian (μ, σ) convolved with an
 * exponential (τ). τ captures the slow tail of the distribution and is a
 * sensitive marker of attentional lapses (e.g. Hervey et al., 2006).
 */
export interface ExGaussFit {
  mu: number
  sigma: number
  tau: number
  logLik: number
  n: number
  converged: boolean
}

export function exGaussLogPdf(x: number, mu: number, sigma: number, tau: number): number {
  const z = (x - mu) / sigma - sigma / tau
  return -Math.log(tau) + (mu - x) / tau + (sigma * sigma) / (2 * tau * tau) + logNormCdf(z)
}

export function exGaussPdf(x: number, mu: number, sigma: number, tau: number): number {
  return Math.exp(exGaussLogPdf(x, mu, sigma, tau))
}

/** Method-of-moments starting values (Heathcote, 1996). */
export function exGaussMoments(
  xs: readonly number[],
): { mu: number; sigma: number; tau: number } | null {
  const m = mean(xs)
  const s = sd(xs)
  const g = skewness(xs)
  if (m === null || s === null || g === null || s === 0) return null
  const tau = g > 0 ? s * Math.cbrt(g / 2) : 0.2 * s
  const tauC = Math.min(Math.max(tau, 0.05 * s), 0.95 * s)
  const sigma = Math.sqrt(Math.max(s * s - tauC * tauC, (0.1 * s) ** 2))
  return { mu: m - tauC, sigma, tau: tauC }
}

/**
 * Maximum-likelihood fit (Nelder–Mead on μ, log σ, log τ). Returns null with
 * fewer than `minN` observations (default 40), where estimates are unstable.
 */
export function fitExGauss(
  values: readonly (number | null | undefined)[],
  minN = 40,
): ExGaussFit | null {
  const xs = finite(values)
  if (xs.length < minN) return null
  const start = exGaussMoments(xs)
  if (!start) return null
  const nll = ([mu, ls, lt]: number[]) => {
    const sigma = Math.exp(ls!)
    const tau = Math.exp(lt!)
    let s = 0
    for (const x of xs) s -= exGaussLogPdf(x, mu!, sigma, tau)
    return s
  }
  const res = nelderMead(nll, [start.mu, Math.log(start.sigma), Math.log(start.tau)], {
    step: [0.1 * start.sigma + 1, 0.3, 0.3],
    maxIter: 4000,
    tol: 1e-10,
  })
  return {
    mu: res.x[0]!,
    sigma: Math.exp(res.x[1]!),
    tau: Math.exp(res.x[2]!),
    logLik: -res.fx,
    n: xs.length,
    converged: res.converged,
  }
}
