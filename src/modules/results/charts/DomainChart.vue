<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EChart from './EChart.vue'
import { baseAxes, useChartTokens } from './theme'
import { tooltipBase, tooltipBox } from './tooltip'
import { DOMAIN_SLOT, type domainComposites } from '../analysis'

const props = defineProps<{ series: ReturnType<typeof domainComposites>; label: string }>()
const { t, n, d } = useI18n()
const tk = useChartTokens()

const option = computed(() => {
  const c = tk.value
  const ax = baseAxes(c)
  const color = (g: string) => {
    const slot = DOMAIN_SLOT[g as keyof typeof DOMAIN_SLOT]
    return slot === undefined ? c.other : c.series[slot]
  }
  const label = (g: string) => t(`activities.groups.${g}`)
  // Direct end labels only when they cannot collide (≤ 4 series, ends well apart);
  // otherwise the legend and the tooltip carry identity.
  const ends = props.series.map((s) => s.points.at(-1)?.y ?? 0).sort((a, b) => a - b)
  const all = props.series.flatMap((s) => s.points.map((p) => p.y))
  const span = Math.max(0.5, Math.max(...all, 0) - Math.min(...all, 0))
  const apart = ends.every((v, i) => i === 0 || v - ends[i - 1]! > span * 0.08)
  const few = props.series.length <= 4 && apart
  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${n(v, 'decimal1')}`
  return {
    animation: false,
    textStyle: ax.textStyle,
    grid: { left: 40, right: few ? 110 : 16, top: 36, bottom: 28 },
    legend: {
      top: 0,
      left: 0,
      itemGap: 16,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: c.textSecondary, fontSize: 11 },
    },
    tooltip: {
      ...tooltipBase(c),
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: c.axis, width: 1 } },
      formatter: (
        params: { axisValue: number; seriesName: string; value: [number, number]; color: string }[],
      ) =>
        tooltipBox(
          c,
          t('results.weekOf', { date: d(new Date(params[0]?.axisValue ?? 0), 'medium') }),
          params.map((p) => ({ color: p.color, value: fmt(p.value[1]), label: p.seriesName })),
        ),
    },
    xAxis: ax.xTime,
    yAxis: {
      ...ax.yValue,
      axisLabel: { ...ax.yValue.axisLabel, formatter: (v: number) => fmt(v) },
    },
    series: props.series.map((s, i) => ({
      name: label(s.group),
      type: 'line',
      data: s.points.map((p) => [p.t, p.y]),
      lineStyle: { width: 2, color: color(s.group), cap: 'round', join: 'round' },
      itemStyle: { color: color(s.group), borderColor: c.surface, borderWidth: 2 },
      symbol: 'circle',
      symbolSize: 8,
      showSymbol: s.points.length <= 20,
      endLabel: few
        ? { show: true, formatter: label(s.group), color: c.textSecondary, fontSize: 11 }
        : undefined,
      markLine:
        i === 0
          ? {
              silent: true,
              symbol: 'none',
              label: { show: false },
              lineStyle: { color: c.axis, width: 1, type: 'solid' },
              data: [{ yAxis: 0 }],
            }
          : undefined,
    })),
  }
})
</script>

<template>
  <EChart :option="option" :height="260" :label="label" />
</template>
