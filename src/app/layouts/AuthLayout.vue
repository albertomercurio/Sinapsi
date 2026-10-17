<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BrandMark from '@/shared/components/BrandMark.vue'
import LanguageSwitcher from '@/shared/components/LanguageSwitcher.vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="flex items-center justify-between px-6 py-4">
      <BrandMark />
      <LanguageSwitcher />
    </header>
    <main class="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
      <slot />
    </main>
    <footer class="text-muted-foreground px-6 py-4 text-center text-xs">
      {{ t('common.footerPrivacy') }}
    </footer>
  </div>
</template>
