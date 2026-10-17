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

/**
 * After a deploy, a tab still running the previous version asks for page chunks
 * that no longer exist. Reload once to pick up the new version instead of
 * failing the navigation (guarded so a real outage cannot cause a reload loop).
 */
function reloadOnStaleChunks() {
  const KEY = 'sinapsi.chunkReload'
  window.addEventListener('vite:preloadError', (event) => {
    try {
      if (Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < 60_000) return
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      return
    }
    event.preventDefault()
    window.location.reload()
  })
}

export async function bootstrap() {
  reloadOnStaleChunks()
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
