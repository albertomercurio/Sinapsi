<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import PageHeader from '@/shared/components/PageHeader.vue'
import { useAuthStore } from '@/modules/auth/store'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const tabs = computed(() => [
  { name: 'settings-profile', label: t('settings.tabs.profile') },
  { name: 'settings-security', label: t('settings.tabs.security') },
  ...(auth.currentMembership?.role === 'owner'
    ? [
        { name: 'settings-organization', label: t('settings.tabs.organization') },
        { name: 'settings-privacy', label: t('settings.tabs.privacy') },
        { name: 'settings-audit', label: t('settings.tabs.audit') },
      ]
    : []),
])
</script>

<template>
  <div>
    <PageHeader :title="t('settings.title')" />
    <nav
      class="bg-muted mb-6 inline-flex max-w-full overflow-x-auto rounded-lg p-1"
      :aria-label="t('settings.title')"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap"
        :class="
          route.name === tab.name
            ? 'bg-background shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        "
      >
        {{ tab.label }}
      </RouterLink>
    </nav>
    <RouterView />
  </div>
</template>
