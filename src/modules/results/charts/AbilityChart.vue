<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EChart from './EChart.vue'
import { baseAxes, useChartTokens } from './theme'
import { tooltipBase, tooltipBox } from './tooltip'
import type { AbilityPoint } from '../analysis'

const props = defineProps<{ points: AbilityPoint[]; label: string }>()
const emit = defineEmits<{ open: [runId: string] }>()
const { t, n, d } = useI18n()
const tk = useChartTokens()

const option = computed(() => {
  const c = tk.value
  const ax = baseAxes(c)
  const pts = props.points
  const lo = Math.max(0.5, Math.floor(Math.min(...pts.map((p) => Math.min(p.lo, p.difficulty)), 1)))
  const hi = Math.min(6.5, Math.ceil(Math.max(...pts.map((p) => Math.max(p.hi, p.difficulty)), 4)))
  const last = pts.at(-1)
  const names = {
    ability: t('results.ability'),
    played: t('results.playedDifficulty'),
    band: t('results.interval95'),
  }
  return {
    animation: false,
    textStyle: ax.textStyle,
    grid: { left: 36, right: 48, top: 36, bottom: 28 },
    legend: {
      top: 0,
      left: 0,
      itemGap: 16,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: c.textSecondary, fontSize: 11 },
      data: [names.ability, names.played, names.band],
    },
    tooltip: {
      ...tooltipBase(c),
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: c.axis, width: 1 } },
      formatter: (params: { dataIndex: number }[]) => {
        const p = pts[params[0]?.dataIndex ?? 0]
        if (!p) return ''
        return tooltipBox(c, d(new Date(p.t), 'dateTime'), [
          { color: c.series[0], value: `L${n(p.level, 'decimal1')}`, label: names.ability },
          { value: `L${n(p.lo, 'decimal1')} – L${n(p.hi, 'decimal1')}`, label: names.band },
          { color: c.muted, value: `L${n(p.difficulty, 'decimal1')}`, label: names.played },
          ...(p.score !== null
            ? [{ value: n(p.score, 'integer'), label: t('metrics.score') }]
            : []),
        ])
      },
    },
    xAxis: ax.xTime,
    yAxis: {
      ...ax.yValue,
      min: lo,
      max: hi,
      interval: 1,
      axisLabel: {
        ...ax.yValue.axisLabel,
        formatter: (v: number) => (Number.isInteger(v) ? `L${v}` : ''),
      },
    },
    series: [
      {
        name: 'band-base',
        type: 'line',
        data: pts.map((p) => [p.t, p.lo]),
        stack: 'band',
        lineStyle: { opacity: 0 },
        symbol: 'none',
        silent: true,
        tooltip: { show: false },
      },
      {
        name: names.band,
        type: 'line',
        data: pts.map((p) => [p.t, p.hi - p.lo]),
        stack: 'band',
        lineStyle: { opacity: 0 },
        symbol: 'none',
        areaStyle: { color: c.series[0], opacity: 0.1 },
        itemStyle: { color: c.series[0], opacity: 0.25 },
        silent: true,
      },
      {
        name: names.ability,
        type: 'line',
        data: pts.map((p) => ({ value: [p.t, p.level], runId: p.runId })),
        lineStyle: { width: 2, color: c.series[0], cap: 'round', join: 'round' },
        itemStyle: { color: c.series[0], borderColor: c.surface, borderWidth: 2 },
        symbol: 'circle',
        symbolSize: 9,
        showSymbol: pts.length <= 40,
        endLabel: {
          show: !!last,
          formatter: () => (last ? `L${n(last.level, 'decimal1')}` : ''),
          color: c.textPrimary,
          fontWeight: 600,
          fontSize: 12,
        },
        markArea: {
          silent: true,
          itemStyle: { color: c.band },
          data: [1, 3, 5]
            .filter((v) => v >= lo && v < hi)
            .map((v) => [{ yAxis: v }, { yAxis: v + 1 }]),
        },
      },
      {
        name: names.played,
        type: 'scatter',
        data: pts.map((p) => ({ value: [p.t, p.difficulty], runId: p.runId })),
        symbolSize: 8,
        itemStyle: { color: c.muted, borderColor: c.surface, borderWidth: 2 },
        z: 1,
      },
    ],
  }
})
</script>

<template>
  <EChart
    :option="option"
    :height="240"
    :label="label"
    @point-click="
      (p) => (p as { runId?: string })?.runId && emit('open', (p as { runId: string }).runId)
    "
  />
</template>
