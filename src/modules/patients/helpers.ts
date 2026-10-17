import type { Patient } from '@/shared/api/types'
import { ageGroupFor, type AgeGroup } from '@/modules/activities/taxonomy'
import type { PatientUiPrefs } from '@/modules/activities/runtime/types'

export function patientAge(p: Pick<Patient, 'birth_year'>, now = new Date()): number | null {
  return p.birth_year ? now.getFullYear() - p.birth_year : null
}

export function patientAgeGroup(p: Pick<Patient, 'birth_year'>): AgeGroup {
  return ageGroupFor(p.birth_year)
}

export function patientPrefs(p: Pick<Patient, 'ui_prefs' | 'birth_year'>): PatientUiPrefs {
  const prefs = (p.ui_prefs ?? {}) as PatientUiPrefs
  return { theme: prefs.theme ?? (patientAgeGroup(p) === 'child' ? 'kids' : 'standard'), ...prefs }
}
