<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MetricDescriptor } from '@/modules/activities/types'
import ChartCard from './ChartCard.vue'
import TrendBadge from './TrendBadge.vue'
import InfoTip from '@/shared/components/InfoTip.vue'
import { metricGuideSection } from '@/modules/guide/sections'
import MetricChart from '../charts/MetricChart.vue'
import { analyzeMetric, type MetricPoint } from '../analysis'
import { formatMetric, metricLabelKey } from '../format'

const props = defineProps<{ metric: MetricDescriptor; points: MetricPoint[]; seed: string }>()
const emit = defineEmits<{ open: [runId: string] }>()
const { t, n, d, te } = useI18n()
const analysis = computed(() => analyzeMetric(props.points, props.metric.polarity, props.seed))
const label = computed(() => t(metricLabelKey(props.metric)))
const fmt = (v: number) => formatMetric(v, props.metric.unit, n as never, t)
const slope30 = computed(() => {
  const s = analysis.value.trend
  if (s.slope === null || !s.ci) return null
  return { v: s.slope * 30, lo: s.ci.lo * 30, hi: s.ci.hi * 30 }
})
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v))}`
</script>

<template>
  <ChartCard
    :title="label"
    :help="
      te(`metricsHelp.${metric.key}`)
        ? `${t(`metricsHelp.${metric.key}`)} ${t('help.metricChart')}`
        : t('help.metricChart')
    "
    :guide="metricGuideSection(metric.key) ?? 'trends'"
    :subtitle="points.length ? t('results.lastValue', { v: fmt(points.at(-1)!.y) }) : undefined"
  >
    <template v-if="metric.polarity !== 0" #badge
      ><TrendBadge :direction="analysis.trend.direction" /><InfoTip
        :text="t('help.trend')"
        :label="t('results.trendLabel')"
        guide="trends"
    /></template>
    <MetricChart
      v-if="points.length"
      :analysis="analysis"
      :unit="metric.unit"
      :label="label"
      @open="emit('open', $event)"
    />
    <p v-else class="text-muted-foreground py-8 text-center text-sm">{{ t('results.noData') }}</p>
    <template #table>
      <table class="w-full">
        <thead>
          <tr class="text-muted-foreground text-left text-xs">
            <th class="py-1">{{ t('common.date') }}</th>
            <th class="py-1 text-right">{{ label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in [...points].reverse()" :key="p.runId" class="border-t">
            <td class="py-1">{{ d(new Date(p.t), 'dateTime') }}</td>
            <td class="py-1 text-right tabular-nums">{{ fmt(p.y) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
    <template #footer>
      <dl v-if="slope30 || analysis.change" class="text-muted-foreground mt-2 grid gap-1 text-xs">
        <div v-if="slope30" class="flex justify-between gap-2">
          <dt class="flex items-center gap-1">
            {{ t('results.slope30') }}<InfoTip :text="t('help.slope30')" guide="trends" />
          </dt>
          <dd class="tabular-nums">
            {{ signed(slope30.v) }}
            <span class="opacity-70"
              >({{
                t('results.likelyRange', { lo: signed(slope30.lo), hi: signed(slope30.hi) })
              }})</span
            >
          </dd>
        </div>
        <div v-if="analysis.change" class="flex justify-between gap-2">
          <dt class="flex items-center gap-1">
            {{ t('results.changeFromBaseline')
            }}<InfoTip :text="t('help.changeFromBaseline')" guide="trends" />
          </dt>
          <dd class="tabular-nums">
            {{ signed(analysis.change.diff) }}
            <span class="opacity-70"
              >({{
                t('results.likelyRange', {
                  lo: signed(analysis.change.lo),
                  hi: signed(analysis.change.hi),
                })
              }})</span
            >
          </dd>
        </div>
      </dl>
    </template>
  </ChartCard>
</template>
