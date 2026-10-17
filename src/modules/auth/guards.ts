import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { useAuthStore } from './store'

/**
 * Navigation guard. The database enforces the same rules (RLS requires aal2),
 * so this only decides which screen to show — it is not the security boundary.
 */
export async function resolveAccess(to: RouteLocationNormalized): Promise<true | RouteLocationRaw> {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAal2) return homeFor(auth)
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }

  if (!auth.isAal2) {
    if (to.meta.allowAal1) return true
    const redirect = to.fullPath !== '/' ? { redirect: to.fullPath } : {}
    return auth.needsMfaVerify
      ? { name: 'mfa-verify', query: redirect }
      : { name: 'mfa-enroll', query: redirect }
  }

  // Signed in with the second factor from here on.
  if (to.meta.allowAal1 && (to.name === 'mfa-verify' || to.name === 'mfa-enroll')) {
    if (to.name === 'mfa-enroll' && to.query.extra === '1') return true
    return homeFor(auth)
  }

  if (to.meta.adminArea) {
    return auth.isPlatformAdmin ? true : homeFor(auth)
  }

  if (to.matched.some((r) => r.meta.anyAccount) && !to.meta.roles) return true

  if (!auth.currentMembership) {
    return auth.isPlatformAdmin ? { name: 'admin' } : { name: 'no-organization' }
  }

  const roles = to.meta.roles
  if (roles && !roles.some((r) => auth.roles.includes(r))) {
    return { name: 'home' }
  }
  return true
}

function homeFor(auth: ReturnType<typeof useAuthStore>): RouteLocationRaw {
  if (!auth.currentMembership && auth.isPlatformAdmin) return { name: 'admin' }
  return { name: 'home' }
}

export function installAuthGuards(router: Router) {
  router.beforeEach((to) => resolveAccess(to))
}
