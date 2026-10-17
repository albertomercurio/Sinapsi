import { LayoutDashboard } from '@lucide/vue'
import { defineModule } from '@/app/module'

export default defineModule({
  id: 'dashboard',
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./pages/HomePage.vue'),
      meta: { titleKey: 'dashboard.title' },
    },
  ],
  nav: [{ to: '/', labelKey: 'dashboard.title', icon: LayoutDashboard, order: 10 }],
})
