<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EChart from './EChart.vue'
import { useChartTokens } from './theme'
import { tooltipBase, tooltipBox } from './tooltip'
import type { domainProfile } from '../analysis'

const props = defineProps<{
  rows: ReturnType<typeof domainProfile>
  fromLabel: string
  toLabel: string
  label: string
}>()
const { t, n } = useI18n()
const tk = useChartTokens()

const option = computed(() => {
  const c = tk.value
  const cats = props.rows.map((r) => t(`activities.groups.${r.group}`))
  const min = Math.floor(Math.min(...props.rows.flatMap((r) => [r.from, r.to]), 1))
  const max = Math.ceil(Math.max(...props.rows.flatMap((r) => [r.from, r.to]), 4))
  return {
    animation: false,
    textStyle: { fontFamily: 'Inter Variable, system-ui, sans-serif', color: c.textSecondary },
    grid: { left: 150, right: 24, top: 32, bottom: 28 },
    legend: {
      top: 0,
      left: 0,
      itemGap: 16,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: c.textSecondary, fontSize: 11 },
      data: [props.fromLabel, props.toLabel],
    },
    tooltip: {
      ...tooltipBase(c),
      trigger: 'item',
      formatter: (p: { dataIndex: number }) => {
        const r = props.rows[p.dataIndex]
        if (!r) return ''
        const delta = r.to - r.from
        return tooltipBox(c, t(`activities.groups.${r.group}`), [
          { color: c.muted, value: `L${n(r.from, 'decimal1')}`, label: props.fromLabel },
          { color: c.series[0], value: `L${n(r.to, 'decimal1')}`, label: props.toLabel },
          { value: `${delta >= 0 ? '+' : ''}${n(delta, 'decimal1')}`, label: t('results.change') },
        ])
      },
    },
    xAxis: {
      type: 'value',
      min,
      max,
      interval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: c.grid, width: 1 } },
      axisLabel: { color: c.muted, fontSize: 11, formatter: (v: number) => `L${v}` },
    },
    yAxis: {
      type: 'category',
      data: cats,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: c.textSecondary, fontSize: 12 },
    },
    series: [
      {
        type: 'custom',
        silent: true,
        renderItem: (
          _: unknown,
          api: { value: (i: number) => number; coord: (v: number[]) => number[] },
        ) => {
          const a = api.coord([api.value(0), api.value(2)])
          const b = api.coord([api.value(1), api.value(2)])
          return {
            type: 'line',
            shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] },
            style: { stroke: c.axis, lineWidth: 2 },
          }
        },
        data: props.rows.map((r, i) => [r.from, r.to, i]),
        encode: { x: [0, 1], y: 2 },
        z: 1,
      },
      {
        name: props.fromLabel,
        type: 'scatter',
        data: props.rows.map((r, i) => [r.from, i]),
        symbolSize: 12,
        itemStyle: { color: c.muted, borderColor: c.surface, borderWidth: 2 },
        z: 2,
      },
      {
        name: props.toLabel,
        type: 'scatter',
        data: props.rows.map((r, i) => [r.to, i]),
        symbolSize: 12,
        itemStyle: { color: c.series[0], borderColor: c.surface, borderWidth: 2 },
        z: 3,
      },
    ],
  }
})
</script>

<template>
  <EChart :option="option" :height="Math.max(160, rows.length * 44 + 64)" :label="label" />
</template>
