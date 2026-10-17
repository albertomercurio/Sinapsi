/**
 * Transformed up–down staircase (Levitt, 1971). With `down` = 3 and `up` = 1
 * the procedure converges on the level answered correctly 79.4% of the time
 * (p³ = 0.5). Used within a run for span tasks.
 */
export class Staircase {
  value: number
  readonly reversals: number[] = []
  readonly history: { value: number; correct: boolean }[] = []
  private streak = 0
  private lastDirection: -1 | 0 | 1 = 0

  constructor(
    private readonly opts: {
      start: number
      min: number
      max: number
      step?: number
      down?: number
      up?: number
    },
  ) {
    this.value = opts.start
  }

  record(correct: boolean): number {
    const { min, max, step = 1, down = 3, up = 1 } = this.opts
    this.history.push({ value: this.value, correct })
    let dir: -1 | 0 | 1 = 0
    if (correct) {
      this.streak = this.streak > 0 ? this.streak + 1 : 1
      if (this.streak >= down) {
        dir = 1
        this.streak = 0
      }
    } else {
      this.streak = this.streak < 0 ? this.streak - 1 : -1
      if (-this.streak >= up) {
        dir = -1
        this.streak = 0
      }
    }
    if (dir !== 0) {
      if (this.lastDirection !== 0 && dir !== this.lastDirection) this.reversals.push(this.value)
      this.lastDirection = dir
      this.value = Math.min(max, Math.max(min, this.value + dir * step))
    }
    return this.value
  }

  /** Mean of the last `k` reversal values: the threshold estimate. */
  threshold(k = 6): number | null {
    if (!this.reversals.length) return null
    const last = this.reversals.slice(-k)
    return last.reduce((a, b) => a + b, 0) / last.length
  }
}
