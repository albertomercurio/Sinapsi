import { Puzzle } from '@lucide/vue'
import { defineModule } from '@/app/module'

export default defineModule({
  id: 'activities',
  routes: [
    {
      path: '/activities',
      name: 'activities',
      component: () => import('./pages/CatalogPage.vue'),
      meta: { titleKey: 'activities.title' },
    },
    {
      path: '/activities/:id/try',
      name: 'activity-try',
      component: () => import('./pages/TryActivityPage.vue'),
      meta: { layout: 'player', titleKey: 'activities.try' },
    },
    {
      path: '/activities/:id/print',
      name: 'activity-print',
      component: () => import('./pages/PrintActivityPage.vue'),
      meta: { layout: 'bare', titleKey: 'activities.printTitle' },
    },
  ],
  nav: [{ to: '/activities', labelKey: 'activities.title', icon: Puzzle, order: 40 }],
})
