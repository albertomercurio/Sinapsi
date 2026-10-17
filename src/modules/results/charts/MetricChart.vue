<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MetricUnit } from '@/modules/activities/types'
import EChart from './EChart.vue'
import { baseAxes, useChartTokens } from './theme'
import { tooltipBase, tooltipBox } from './tooltip'
import { formatMetric } from '../format'
import type { MetricAnalysis } from '../analysis'

const props = defineProps<{ analysis: MetricAnalysis; unit: MetricUnit; label: string }>()
const emit = defineEmits<{ open: [runId: string] }>()
const { t, n, d } = useI18n()
const tk = useChartTokens()

const option = computed(() => {
  const c = tk.value
  const ax = baseAxes(c)
  const fmt = (v: number) => formatMetric(v, props.unit, n as never, t)
  const names = { runs: t('results.runs'), smooth: t('results.smoothed') }
  const pts = props.analysis.points
  const scale = props.unit === 'percent' ? 100 : 1
  return {
    animation: false,
    textStyle: ax.textStyle,
    grid: { left: 44, right: 16, top: props.analysis.smooth.length ? 30 : 12, bottom: 28 },
    legend: props.analysis.smooth.length
      ? {
          top: 0,
          left: 0,
          itemGap: 16,
          itemWidth: 14,
          itemHeight: 8,
          textStyle: { color: c.textSecondary, fontSize: 11 },
          data: [names.runs, names.smooth],
        }
      : undefined,
    tooltip: {
      ...tooltipBase(c),
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: c.axis, width: 1 } },
      formatter: (params: { dataIndex: number; seriesName: string }[]) => {
        const i =
          params.find((p) => p.seriesName === names.runs)?.dataIndex ?? params[0]?.dataIndex ?? 0
        const p = pts[i]
        if (!p) return ''
        const s = props.analysis.smooth[i]
        return tooltipBox(c, d(new Date(p.t), 'dateTime'), [
          { color: c.series[0], value: fmt(p.y), label: names.runs },
          ...(s ? [{ color: c.series[0], value: fmt(s.y), label: names.smooth }] : []),
        ])
      },
    },
    xAxis: ax.xTime,
    yAxis: {
      ...ax.yValue,
      scale: true,
      axisLabel: {
        ...ax.yValue.axisLabel,
        formatter: (v: number) =>
          scale === 100
            ? `${Math.round(v * 100)}%`
            : n(v, Math.abs(v) >= 10 ? 'integer' : 'decimal1'),
      },
    },
    series: [
      {
        name: names.runs,
        type: 'scatter',
        data: pts.map((p) => ({ value: [p.t, p.y], runId: p.runId })),
        symbolSize: 9,
        itemStyle: { color: c.series[0], borderColor: c.surface, borderWidth: 2, opacity: 0.85 },
      },
      ...(props.analysis.smooth.length
        ? [
            {
              name: names.smooth,
              type: 'line',
              data: props.analysis.smooth.map((p) => [p.t, p.y]),
              symbol: 'none',
              smooth: false,
              silent: true,
              lineStyle: { width: 2, color: c.series[0], cap: 'round', join: 'round' },
              itemStyle: { color: c.series[0] },
            },
          ]
        : []),
    ],
  }
})
</script>

<template>
  <EChart
    :option="option"
    :height="200"
    :label="label"
    @point-click="
      (p) => (p as { runId?: string })?.runId && emit('open', (p as { runId: string }).runId)
    "
  />
</template>
