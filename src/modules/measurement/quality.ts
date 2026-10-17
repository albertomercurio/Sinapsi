import type { RunRecording } from './types'

/**
 * Run-level data-quality flags. Flagged runs are still saved, but charts mark
 * them and the therapist can exclude them from trends.
 */
export function qualityFlags(rec: RunRecording, opts: { minTrials?: number } = {}): string[] {
  const flags: string[] = []
  const longBreaks = rec.interruptions.filter((i) => i.type !== 'pause' && i.durationMs > 3000)
  if (longBreaks.length) flags.push('interrupted')
  if (rec.interruptions.some((i) => i.type === 'pause')) flags.push('paused')
  const responded = rec.trials.filter((t) => typeof t.rt === 'number')
  const anticipations = responded.filter((t) => (t.rt as number) < 150).length
  if (responded.length >= 10 && anticipations / responded.length > 0.1)
    flags.push('many_anticipations')
  if (rec.trials.length < (opts.minTrials ?? 3)) flags.push('few_trials')
  if (rec.device.input === 'mixed') flags.push('mixed_input')
  return flags
}
