import { createRouter, createWebHistory } from 'vue-router'
import { installAuthGuards } from '@/modules/auth/guards'
import { i18n } from './i18n'
import { modules } from './modules'

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      ...modules.flatMap((m) => m.routes ?? []),
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('./NotFoundPage.vue'),
        meta: { public: true, layout: 'auth' },
      },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })

  installAuthGuards(router)

  router.afterEach((to) => {
    const t = i18n.global.t
    document.title = to.meta.titleKey ? `${t(to.meta.titleKey)} · Sinapsi` : 'Sinapsi'
  })

  return router
}
