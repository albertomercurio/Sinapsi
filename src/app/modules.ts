import type { AppModule, NavItem } from './module'
import auth from '@/modules/auth'
import dashboard from '@/modules/dashboard'
import patients from '@/modules/patients'
import activities from '@/modules/activities'
import sessions from '@/modules/sessions'
import results from '@/modules/results'
import settings from '@/modules/settings'
import guide from '@/modules/guide'
import admin from '@/modules/admin'

/** Registry of feature modules. Adding a module = one import + one entry. */
export const modules: AppModule[] = [
  auth,
  dashboard,
  patients,
  activities,
  sessions,
  results,
  settings,
  guide,
  admin,
]

export const navItems: NavItem[] = modules
  .flatMap((m) => m.nav ?? [])
  .sort((a, b) => a.order - b.order)
