<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/shared/ui/badge'
import { formatMetric, metricLabelKey } from '@/modules/results/format'
import type { ActivityDefinition } from '../types'

const props = defineProps<{
  activity: ActivityDefinition
  metrics: Record<string, number | null>
  score?: number | null
  flags?: string[]
}>()
const { t, n } = useI18n()

const rows = computed(() =>
  props.activity.metrics.map((m) => ({
    key: m.key,
    label: t(metricLabelKey(m)),
    value: formatMetric(props.metrics[m.key], m.unit, n as never, t),
    primary: m.primary,
  })),
)
</script>

<template>
  <div class="grid gap-3">
    <div v-if="score !== undefined && score !== null" class="flex items-baseline gap-2">
      <span class="text-3xl font-bold tabular-nums">{{ n(score, 'integer') }}</span>
      <span class="text-muted-foreground text-sm">/ 100 · {{ t('metrics.score') }}</span>
    </div>
    <div v-if="flags?.length" class="flex flex-wrap gap-1">
      <Badge v-for="f in flags" :key="f" variant="warning">{{ t(`quality.${f}`) }}</Badge>
    </div>
    <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div
        v-for="r in rows"
        :key="r.key"
        class="flex items-baseline justify-between gap-3 border-b py-1.5"
        :class="r.primary ? 'font-medium' : ''"
      >
        <dt class="text-muted-foreground">{{ r.label }}</dt>
        <dd class="shrink-0 whitespace-nowrap tabular-nums">{{ r.value }}</dd>
      </div>
    </dl>
  </div>
</template>
