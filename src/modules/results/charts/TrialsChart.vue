<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RunRecording } from '@/modules/measurement'
import { median, mad } from '@/modules/scoring'
import EChart from './EChart.vue'
import { baseAxes, useChartTokens } from './theme'
import { tooltipBase, tooltipBox } from './tooltip'

/** Trial-by-trial response times; correct vs error vs flagged differ by colour AND shape. */
const props = defineProps<{ recording: RunRecording; label: string }>()
const { t, n } = useI18n()
const tk = useChartTokens()

const option = computed(() => {
  const c = tk.value
  const ax = baseAxes(c)
  const trials = props.recording.trials.filter((tr) => typeof tr.rt === 'number')
  const rts = trials
    .filter((tr) => tr.correct !== false && (tr.rt as number) >= 150)
    .map((tr) => tr.rt as number)
  const med = median(rts) ?? 0
  const upper = med + 3 * (mad(rts) ?? 0)
  const kind = (rt: number, correct: boolean | undefined) =>
    rt < 150 || rt > upper ? 'flag' : correct === false ? 'error' : 'ok'
  const names = {
    ok: t('results.correct'),
    error: t('results.errorsLabel'),
    flag: t('results.outliers'),
  }
  const build = (k: 'ok' | 'error' | 'flag') =>
    trials
      .filter((tr) => kind(tr.rt as number, tr.correct) === k)
      .map((tr) => [tr.i + 1, tr.rt, tr.responses[0]?.holdMs ?? null])
  return {
    animation: false,
    textStyle: ax.textStyle,
    grid: { left: 48, right: 16, top: 32, bottom: 30 },
    legend: {
      top: 0,
      left: 0,
      itemGap: 16,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: c.textSecondary, fontSize: 11 },
    },
    tooltip: {
      ...tooltipBase(c),
      trigger: 'item',
      formatter: (p: {
        value: [number, number, number | null]
        seriesName: string
        color: string
      }) =>
        tooltipBox(c, t('results.trialN', { n: p.value[0] }), [
          { color: p.color, value: `${n(p.value[1], 'integer')} ms`, label: p.seriesName },
          ...(p.value[2] !== null
            ? [{ value: `${n(p.value[2], 'integer')} ms`, label: t('metrics.holdMedian') }]
            : []),
        ]),
    },
    xAxis: {
      type: 'value',
      name: t('results.trial'),
      nameLocation: 'middle',
      nameGap: 22,
      nameTextStyle: { color: c.muted, fontSize: 11 },
      axisLine: { lineStyle: { color: c.axis } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: c.muted, fontSize: 11 },
      minInterval: 1,
    },
    yAxis: {
      ...ax.yValue,
      axisLabel: { ...ax.yValue.axisLabel, formatter: (v: number) => `${v}` },
      name: 'ms',
      nameTextStyle: { color: c.muted, fontSize: 11 },
    },
    series: [
      {
        name: names.ok,
        type: 'scatter',
        data: build('ok'),
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: c.series[0], borderColor: c.surface, borderWidth: 2 },
      },
      {
        name: names.error,
        type: 'scatter',
        data: build('error'),
        symbol: 'triangle',
        symbolSize: 10,
        itemStyle: { color: c.series[1], borderColor: c.surface, borderWidth: 2 },
      },
      {
        name: names.flag,
        type: 'scatter',
        data: build('flag'),
        symbol: 'diamond',
        symbolSize: 10,
        itemStyle: { color: c.muted, borderColor: c.surface, borderWidth: 2 },
      },
    ],
  }
})
</script>

<template>
  <EChart :option="option" :height="240" :label="label" />
</template>
