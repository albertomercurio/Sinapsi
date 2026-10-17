import { CalendarDays } from '@lucide/vue'
import { defineModule } from '@/app/module'

export default defineModule({
  id: 'sessions',
  routes: [
    {
      path: '/sessions',
      name: 'sessions',
      component: () => import('./pages/SessionsPage.vue'),
      meta: { titleKey: 'sessions.title' },
    },
    {
      path: '/sessions/new',
      name: 'session-new',
      component: () => import('./pages/SessionBuilderPage.vue'),
      meta: { titleKey: 'sessions.newTitle' },
    },
    {
      path: '/sessions/:id/edit',
      name: 'session-edit',
      component: () => import('./pages/SessionBuilderPage.vue'),
      meta: { titleKey: 'sessions.editTitle' },
    },
    {
      path: '/sessions/:id/run',
      name: 'session-run',
      component: () => import('./pages/SessionRunnerPage.vue'),
      meta: { layout: 'player', titleKey: 'sessions.runner.title' },
    },
    {
      path: '/sessions/templates/new',
      name: 'template-new',
      component: () => import('./pages/TemplateEditorPage.vue'),
      meta: { titleKey: 'sessions.newTemplate' },
    },
    {
      path: '/sessions/templates/:id',
      name: 'template-edit',
      component: () => import('./pages/TemplateEditorPage.vue'),
      meta: { titleKey: 'sessions.editTemplate' },
    },
  ],
  nav: [{ to: '/sessions', labelKey: 'sessions.title', icon: CalendarDays, order: 30 }],
})
