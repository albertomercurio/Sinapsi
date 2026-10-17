import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

export type AppRole = 'platform_admin' | 'owner' | 'therapist'
export type LayoutName = 'auth' | 'workspace' | 'player' | 'bare'

export interface NavItem {
  to: string
  labelKey: string
  icon: Component
  /** Who sees the entry. Omitted = every member of an organization. */
  roles?: AppRole[]
  order: number
}

/**
 * A feature module. Each folder in src/modules exports one of these from its
 * index.ts; the app shell assembles routes and navigation from the registry
 * in src/app/modules.ts. Translations are discovered by convention
 * (src/modules/<id>/locales/<code>.json → `<id>.*`).
 */
export interface AppModule {
  id: string
  routes?: RouteRecordRaw[]
  nav?: NavItem[]
}

export function defineModule(module: AppModule): AppModule {
  return module
}

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without signing in. */
    public?: boolean
    /** Requires a session but not the second factor (MFA setup screens). */
    allowAal1?: boolean
    layout?: LayoutName
    /** Restrict to roles. Omitted = any organization member. */
    roles?: AppRole[]
    /** Platform-admin area (no organization membership needed). */
    adminArea?: boolean
    /** Any signed-in account with the second factor, member or platform admin (own profile/security). */
    anyAccount?: boolean
    titleKey?: string
  }
}
