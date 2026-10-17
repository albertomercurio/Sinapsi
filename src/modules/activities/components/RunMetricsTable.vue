<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/shared/ui/badge'
import { formatMetric, metricLabelKey } from '@/modules/results/format'
import InfoTip from '@/shared/components/InfoTip.vue'
import { metricGuideSection } from '@/modules/guide/sections'
import type { ActivityDefinition } from '../types'

const props = defineProps<{
  activity: ActivityDefinition
  metrics: Record<string, number | null>
  score?: number | null
  flags?: string[]
}>()
const { t, n, te } = useI18n()

const rows = computed(() =>
  props.activity.metrics.map((m) => ({
    key: m.key,
    label: t(metricLabelKey(m)),
    value: formatMetric(props.metrics[m.key], m.unit, n as never, t),
    primary: m.primary,
    help: te(`metricsHelp.${m.key}`) ? t(`metricsHelp.${m.key}`) : null,
    guide: metricGuideSection(m.key),
  })),
)
</script>

<template>
  <div class="grid gap-3">
    <div v-if="score !== undefined && score !== null" class="flex items-baseline gap-2">
      <span class="text-3xl font-bold tabular-nums">{{ n(score, 'integer') }}</span>
      <span class="text-muted-foreground text-sm">/ 100 · {{ t('metrics.score') }}</span>
    </div>
    <div v-if="flags?.length" class="flex flex-wrap items-center gap-1">
      <Badge v-for="f in flags" :key="f" variant="warning">{{ t(`quality.${f}`) }}</Badge>
      <InfoTip :text="t('help.quality')" :label="t('results.quality')" guide="quality" />
    </div>
    <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div
        v-for="r in rows"
        :key="r.key"
        class="flex items-baseline justify-between gap-3 border-b py-1.5"
        :class="r.primary ? 'font-medium' : ''"
      >
        <dt class="text-muted-foreground flex items-center gap-1">
          {{ r.label }}<InfoTip v-if="r.help" :text="r.help" :label="r.label" :guide="r.guide" />
        </dt>
        <dd class="shrink-0 whitespace-nowrap tabular-nums">{{ r.value }}</dd>
      </div>
    </dl>
  </div>
</template>
