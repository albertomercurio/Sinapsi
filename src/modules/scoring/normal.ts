/**
 * Normal-distribution utilities with good accuracy in the tails, needed by the
 * ex-Gaussian likelihood and signal-detection measures.
 */

const POLY = (t: number) =>
  -1.26551223 +
  t *
    (1.00002368 +
      t *
        (0.37409196 +
          t *
            (0.09678418 +
              t *
                (-0.18628806 +
                  t *
                    (0.27886807 +
                      t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))

/** log(erfc(z)) for z ≥ 0 (Numerical Recipes erfcc, rel. error < 1.2e-7), no underflow. */
function logErfcPos(z: number): number {
  const t = 1 / (1 + 0.5 * z)
  return Math.log(t) - z * z + POLY(t)
}

export function erfc(x: number): number {
  const z = Math.abs(x)
  const r = Math.exp(logErfcPos(z))
  return x >= 0 ? r : 2 - r
}

export function erf(x: number): number {
  return 1 - erfc(x)
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export function normCdf(x: number): number {
  return 0.5 * erfc(-x / Math.SQRT2)
}

/** log Φ(x), accurate for very negative x. */
export function logNormCdf(x: number): number {
  if (x < 0) return Math.log(0.5) + logErfcPos(-x / Math.SQRT2)
  return Math.log(normCdf(x))
}

/**
 * Inverse standard normal CDF (Acklam's algorithm + one Halley refinement step,
 * absolute error ~1e-7, bounded by the erfc approximation used in the refinement).
 */
export function probit(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
    2.506628277459239,
  ]
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972,
    -13.28068155288572,
  ]
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const plow = 0.02425
  const phigh = 1 - plow
  let x: number
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p))
    x =
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
  } else if (p <= phigh) {
    const q = p - 0.5
    const r = q * q
    x =
      ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    x =
      -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
  }
  // Halley refinement
  const e = normCdf(x) - p
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2)
  return x - u / (1 + (x * u) / 2)
}
