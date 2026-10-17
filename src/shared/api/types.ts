import type { Database } from './database.types'

type PublicTables = Database['public']['Tables']

export type Row<T extends keyof PublicTables> = PublicTables[T]['Row']
export type SessionMode = Database['public']['Enums']['session_mode']
export type SessionStatus = Database['public']['Enums']['session_status']

export type Patient = Row<'patients'>
export type PatientCondition = Row<'patient_conditions'>
export type Session = Row<'sessions'>
export type SessionItem = Row<'session_items'>
export type SessionTemplate = Row<'session_templates'>
export type ActivityRun = Row<'activity_runs'>
export type PatientAbility = Row<'patient_ability'>
export type AuditEntry = Row<'audit_log'>
