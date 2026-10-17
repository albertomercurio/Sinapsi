import { Settings } from '@lucide/vue'
import { defineModule } from '@/app/module'

export default defineModule({
  id: 'settings',
  routes: [
    {
      path: '/settings',
      component: () => import('./pages/SettingsLayout.vue'),
      meta: { titleKey: 'settings.title', anyAccount: true },
      children: [
        { path: '', redirect: { name: 'settings-profile' } },
        {
          path: 'profile',
          name: 'settings-profile',
          component: () => import('./pages/ProfilePage.vue'),
          meta: { titleKey: 'settings.tabs.profile' },
        },
        {
          path: 'security',
          name: 'settings-security',
          component: () => import('./pages/SecurityPage.vue'),
          meta: { titleKey: 'settings.tabs.security' },
        },
        {
          path: 'organization',
          name: 'settings-organization',
          component: () => import('./pages/OrganizationPage.vue'),
          meta: { roles: ['owner'], titleKey: 'settings.tabs.organization' },
        },
        {
          path: 'privacy',
          name: 'settings-privacy',
          component: () => import('./pages/PrivacyPage.vue'),
          meta: { roles: ['owner'], titleKey: 'settings.tabs.privacy' },
        },
        {
          path: 'audit',
          name: 'settings-audit',
          component: () => import('./pages/AuditPage.vue'),
          meta: { roles: ['owner'], titleKey: 'settings.tabs.audit' },
        },
      ],
    },
  ],
  nav: [
    {
      to: '/settings',
      labelKey: 'settings.title',
      icon: Settings,
      order: 90,
      roles: ['platform_admin', 'owner', 'therapist'],
    },
  ],
})
