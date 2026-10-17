<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Badge } from '@/shared/ui/badge'
import type { SessionStatus } from '@/shared/api/types'

defineProps<{ status: SessionStatus }>()
const { t } = useI18n()
const variant = {
  planned: 'outline',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'secondary',
} as const
</script>

<template>
  <Badge :variant="variant[status]">{{ t(`sessions.status.${status}`) }}</Badge>
</template>
