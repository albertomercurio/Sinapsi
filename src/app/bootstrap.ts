import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import '@fontsource-variable/inter'
import '@fontsource-variable/atkinson-hyperlegible-next'
import '@/assets/main.css'

import App from './App.vue'
import { createAppRouter } from './router'
import { i18n, initialLocale, setLocale } from './i18n'
import { applyColorScheme } from '@/shared/composables/useColorScheme'

export async function bootstrap() {
  applyColorScheme()
  await setLocale(initialLocale())

  const app = createApp(App)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })

  app.use(createPinia())
  app.use(i18n)
  app.use(createAppRouter())
  app.use(VueQueryPlugin, { queryClient })
  app.mount('#app')
}
