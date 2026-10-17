<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { LogOut, Menu, Moon, Sun, X } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import BrandMark from '@/shared/components/BrandMark.vue'
import LanguageSwitcher from '@/shared/components/LanguageSwitcher.vue'
import { useColorScheme } from '@/shared/composables/useColorScheme'
import { useAuthStore } from '@/modules/auth/store'
import { useIdleLogout } from '@/modules/auth/useIdleLogout'
import { navItems } from '../modules'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { scheme, set: setScheme } = useColorScheme()
const mobileOpen = ref(false)

useIdleLogout(() => auth.currentMembership?.idle_timeout_min ?? 15)

watch(
  () => route.fullPath,
  () => (mobileOpen.value = false),
)

const items = computed(() =>
  navItems.filter((item) => {
    if (!item.roles) return !!auth.currentMembership
    return item.roles.some((r) => auth.roles.includes(r))
  }),
)

const orgOptions = computed(() =>
  auth.memberships.map((m) => ({ value: m.org_id, label: m.org_name })),
)

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

function toggleScheme() {
  const dark = document.documentElement.classList.contains('dark')
  setScheme(dark ? 'light' : 'dark')
}

async function onLocaleChange(code: string) {
  await auth.updateProfile({ ui_locale: code }).catch(() => undefined)
}

async function signOut() {
  await auth.signOut()
  await router.replace({ name: 'login' })
}

async function switchOrg(e: Event) {
  auth.selectOrg((e.target as HTMLSelectElement).value)
  await router.replace({ name: 'home' })
}
</script>

<template>
  <div class="flex min-h-dvh">
    <!-- Sidebar -->
    <aside
      class="bg-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform lg:static lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center justify-between px-5">
        <RouterLink to="/"><BrandMark /></RouterLink>
        <button class="lg:hidden" :aria-label="t('common.close')" @click="mobileOpen = false">
          <X class="size-5" />
        </button>
      </div>

      <div v-if="orgOptions.length > 1" class="px-4 pb-3">
        <label class="text-muted-foreground mb-1 block text-xs font-medium">{{
          t('common.organization')
        }}</label>
        <select
          class="bg-card w-full rounded-md border px-2 py-1.5 text-sm"
          :value="auth.currentOrgId ?? ''"
          @change="switchOrg"
        >
          <option v-for="o in orgOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <p
        v-else-if="auth.currentMembership"
        class="text-muted-foreground truncate px-5 pb-3 text-xs font-medium"
      >
        {{ auth.currentMembership.org_name }}
      </p>

      <nav class="flex-1 overflow-y-auto px-3" :aria-label="t('common.mainNav')">
        <ul class="grid gap-0.5">
          <li v-for="item in items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="
                isActive(item.to)
                  ? 'bg-primary/10 text-primary-strong'
                  : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
              "
            >
              <component :is="item.icon" class="size-4.5 shrink-0" aria-hidden="true" />
              {{ t(item.labelKey) }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="border-t p-4">
        <RouterLink
          :to="{ name: 'settings-profile' }"
          class="block truncate text-sm font-medium hover:underline"
        >
          {{ auth.displayName }}
        </RouterLink>
        <p class="text-muted-foreground truncate text-xs">
          {{ auth.isPlatformAdmin ? t('common.roles.platform_admin') : '' }}
          <template v-if="auth.isPlatformAdmin && auth.currentMembership"> · </template>
          {{ auth.currentMembership ? t(`common.roles.${auth.currentMembership.role}`) : '' }}
        </p>
        <div class="mt-3 flex items-center justify-between gap-2">
          <LanguageSwitcher @change="onLocaleChange" />
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              :aria-label="t('common.toggleTheme')"
              @click="toggleScheme"
            >
              <Moon v-if="scheme !== 'dark'" />
              <Sun v-else />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              :aria-label="t('common.signOut')"
              data-testid="sign-out"
              @click="signOut"
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </div>
    </aside>
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="mobileOpen = false"
    />

    <!-- Content -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden"
      >
        <Button
          variant="ghost"
          size="icon"
          :aria-label="t('common.menu')"
          @click="mobileOpen = true"
        >
          <Menu />
        </Button>
        <BrandMark />
      </header>
      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
