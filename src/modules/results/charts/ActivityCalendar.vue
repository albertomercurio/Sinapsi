<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { currentLocale, intlLocale } from '@/app/i18n'
import EChart from './EChart.vue'
import { useChartTokens } from './theme'
import { tooltipBase, tooltipBox } from './tooltip'

const props = defineProps<{ days: [string, number, number][]; label: string; months?: number }>()
const { t, d } = useI18n()
const tk = useChartTokens()

const option = computed(() => {
  const c = tk.value
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth() - (props.months ?? 6) + 1, 1)
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const monthNames = Array.from({ length: 12 }, (_, m) =>
    new Date(2026, m, 1).toLocaleDateString(intlLocale(currentLocale()), { month: 'short' }),
  )
  const seq = c.sequential
  return {
    animation: false,
    tooltip: {
      ...tooltipBase(c),
      formatter: (p: { value: [string, number, number] }) =>
        tooltipBox(c, d(new Date(p.value[0]), 'long'), [
          { value: String(p.value[1]), label: t('results.runs') },
          { value: `${p.value[2]} min`, label: t('results.minutes') },
        ]),
    },
    visualMap: {
      type: 'piecewise',
      show: true,
      orient: 'horizontal',
      left: 0,
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: c.textSecondary, fontSize: 11 },
      pieces: [
        { min: 1, max: 1, label: '1', color: seq[1] },
        { min: 2, max: 3, label: '2–3', color: seq[3] },
        { min: 4, max: 6, label: '4–6', color: seq[4] },
        { min: 7, label: '7+', color: seq[6] },
      ],
      dimension: 1,
    },
    calendar: {
      top: 20,
      left: 28,
      right: 8,
      bottom: 34,
      range: [fmt(start), fmt(end)],
      cellSize: ['auto', 14],
      splitLine: { show: false },
      itemStyle: { color: c.surface, borderColor: c.grid, borderWidth: 2 },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 1,
        nameMap: ['D', 'L', 'M', 'M', 'G', 'V', 'S'].map(() => ''),
        color: c.muted,
        fontSize: 10,
      },
      monthLabel: { nameMap: monthNames, color: c.muted, fontSize: 11 },
    },
    series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: props.days }],
  }
})
</script>

<template>
  <EChart :option="option" :height="170" :label="label" />
</template>
