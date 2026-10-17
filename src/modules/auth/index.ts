import { defineModule } from '@/app/module'

export default defineModule({
  id: 'auth',
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./pages/LoginPage.vue'),
      meta: { public: true, layout: 'auth', titleKey: 'auth.loginTitle' },
    },
    {
      path: '/auth/forgot',
      name: 'forgot-password',
      component: () => import('./pages/ForgotPasswordPage.vue'),
      meta: { public: true, layout: 'auth', titleKey: 'auth.forgotTitle' },
    },
    {
      path: '/auth/confirm',
      name: 'auth-confirm',
      component: () => import('./pages/AuthConfirmPage.vue'),
      meta: { public: true, layout: 'auth' },
    },
    {
      path: '/auth/set-password',
      name: 'set-password',
      component: () => import('./pages/SetPasswordPage.vue'),
      meta: { allowAal1: true, layout: 'auth', titleKey: 'auth.newPasswordTitle' },
    },
    {
      path: '/mfa/enroll',
      name: 'mfa-enroll',
      component: () => import('./pages/MfaEnrollPage.vue'),
      meta: { allowAal1: true, layout: 'auth', titleKey: 'auth.enrollTitle' },
    },
    {
      path: '/mfa/verify',
      name: 'mfa-verify',
      component: () => import('./pages/MfaVerifyPage.vue'),
      meta: { allowAal1: true, layout: 'auth', titleKey: 'auth.verifyTitle' },
    },
    {
      path: '/no-organization',
      name: 'no-organization',
      component: () => import('./pages/NoOrganizationPage.vue'),
      meta: { adminArea: false, layout: 'auth' },
    },
  ],
})
