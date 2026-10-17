import { BookOpen } from '@lucide/vue'
import { defineModule } from '@/app/module'

export default defineModule({
  id: 'guide',
  routes: [
    {
      path: '/guide',
      name: 'guide',
      component: () => import('./pages/GuidePage.vue'),
      meta: { titleKey: 'guide.title', anyAccount: true },
    },
  ],
  nav: [
    {
      to: '/guide',
      labelKey: 'guide.title',
      icon: BookOpen,
      order: 85,
      roles: ['platform_admin', 'owner', 'therapist'],
    },
  ],
})
