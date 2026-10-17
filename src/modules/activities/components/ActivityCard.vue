<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Clock, Printer } from '@lucide/vue'
import { Badge } from '@/shared/ui/badge'
import type { ActivityDefinition } from '../types'
import { groupOf } from '../taxonomy'

const props = defineProps<{ activity: ActivityDefinition; compact?: boolean }>()
const { t } = useI18n()
const groups = computed(() => [...new Set(props.activity.domains.map(groupOf))])
</script>

<template>
  <div
    class="bg-card flex h-full flex-col gap-3 rounded-xl border p-4 shadow-xs"
    data-testid="activity-card"
    :data-activity="activity.id"
  >
    <div class="flex items-start gap-3">
      <span
        class="bg-accent flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        aria-hidden="true"
        >{{ activity.icon }}</span
      >
      <div class="min-w-0 flex-1">
        <h3 class="leading-tight font-semibold">{{ t(`activity.${activity.id}.name`) }}</h3>
        <p class="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
          <span class="inline-flex items-center gap-1"
            ><Clock class="size-3" />
            {{ t('common.minutes', { n: activity.estimatedMinutes }) }}</span
          >
          <span v-if="activity.formats.includes('paper')" class="inline-flex items-center gap-1"
            ><Printer class="size-3" /> {{ t('common.formats.paper') }}</span
          >
        </p>
      </div>
    </div>
    <p v-if="!compact" class="text-muted-foreground line-clamp-3 text-sm">
      {{ t(`activity.${activity.id}.description`) }}
    </p>
    <div class="flex flex-wrap gap-1">
      <Badge v-for="g in groups" :key="g" variant="secondary">{{
        t(`activities.groups.${g}`)
      }}</Badge>
    </div>
    <div class="mt-auto flex flex-wrap gap-2 pt-1">
      <slot />
    </div>
  </div>
</template>
