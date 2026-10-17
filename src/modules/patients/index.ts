import { Users } from '@lucide/vue'
import { defineModule } from '@/app/module'

export default defineModule({
  id: 'patients',
  routes: [
    {
      path: '/patients',
      name: 'patients',
      component: () => import('./pages/PatientsListPage.vue'),
      meta: { titleKey: 'patients.title' },
    },
    {
      path: '/patients/:id',
      name: 'patient',
      component: () => import('./pages/PatientDetailPage.vue'),
      meta: { titleKey: 'patients.patient' },
    },
  ],
  nav: [{ to: '/patients', labelKey: 'patients.title', icon: Users, order: 20 }],
})
