import { watch } from 'vue'
import { useIdle } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useAuthStore } from './store'

/** Signs out after `minutes` without keyboard, pointer or touch activity. */
export function useIdleLogout(minutes: () => number) {
  const auth = useAuthStore()
  const router = useRouter()
  const { idle } = useIdle(minutes() * 60_000, {
    events: ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'],
  })
  watch(idle, async (isIdle) => {
    if (isIdle && auth.isAuthenticated) {
      await auth.signOut('idle')
      await router.replace({ name: 'login' })
    }
  })
}
