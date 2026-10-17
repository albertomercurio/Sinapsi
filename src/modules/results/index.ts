import { defineModule } from '@/app/module'

export default defineModule({
  id: 'results',
  routes: [
    {
      path: '/runs/:id',
      name: 'run',
      component: () => import('./pages/RunDetailPage.vue'),
      meta: { titleKey: 'results.runTitle' },
    },
    {
      path: '/patients/:id/report',
      name: 'report',
      component: () => import('./pages/ReportPage.vue'),
      meta: { layout: 'bare', titleKey: 'results.reportTitle' },
    },
  ],
})
