import { ShieldCheck } from '@lucide/vue'
import { defineModule } from '@/app/module'

export default defineModule({
  id: 'admin',
  routes: [
    {
      path: '/admin',
      name: 'admin',
      component: () => import('./pages/AdminPage.vue'),
      meta: { adminArea: true, titleKey: 'admin.title' },
    },
  ],
  nav: [
    {
      to: '/admin',
      labelKey: 'admin.title',
      icon: ShieldCheck,
      order: 100,
      roles: ['platform_admin'],
    },
  ],
})
