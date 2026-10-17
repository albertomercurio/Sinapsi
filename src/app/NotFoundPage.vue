<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'

const { t } = useI18n()
</script>

<template>
  <div class="bg-card w-full max-w-md rounded-2xl border p-8 text-center shadow-sm">
    <p class="text-muted-foreground font-mono text-sm">404</p>
    <h1 class="mt-2 text-xl font-semibold">{{ t('common.notFound') }}</h1>
    <Button as-child class="mt-6">
      <RouterLink to="/">{{ t('common.backHome') }}</RouterLink>
    </Button>
  </div>
</template>
