import type { RunRecording } from '@/modules/measurement'
import type { ScoreResult } from '../types'

export interface PatientUiPrefs {
  theme?: 'standard' | 'kids'
  font_scale?: number
  high_contrast?: boolean
  reduced_motion?: boolean
  audio?: boolean
  show_timer?: boolean
  feedback?: boolean
}

/** A finished run, ready to be scored, displayed and saved. */
export interface CompletedRun {
  activityId: string
  activityVersion: number
  scoringVersion: number
  difficulty: number
  seed: number
  config: Record<string, unknown>
  recording: RunRecording
  result: ScoreResult
  qualityFlags: string[]
}
