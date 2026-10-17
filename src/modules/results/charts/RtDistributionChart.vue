<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { exGaussPdf, fitExGauss } from '@/modules/scoring'
import EChart from './EChart.vue'
import { baseAxes, useChartTokens } from './theme'
import { tooltipBase, tooltipBox } from './tooltip'

/** Histogram of correct RTs with the fitted ex-Gaussian (expected counts, same axis). */
const props = defineProps<{ rts: number[]; label: string }>()
const { t, n } = useI18n()
const tk = useChartTokens()

const fit = computed(() =>
  fitExGauss(
    props.rts.filter((x) => x >= 150),
    30,
  ),
)

const option = computed(() => {
  const c = tk.value
  const ax = baseAxes(c)
  const xs = props.rts.filter((x) => x >= 150)
  const lo = Math.floor(Math.min(...xs) / 50) * 50
  const hi = Math.ceil(Math.max(...xs) / 50) * 50
  const width = Math.max(25, Math.round((hi - lo) / 18 / 25) * 25)
  const bins: { x0: number; count: number }[] = []
  for (let x = lo; x < hi; x += width)
    bins.push({ x0: x, count: xs.filter((v) => v >= x && v < x + width).length })
  const f = fit.value
  const curve = f
    ? Array.from({ length: 80 }, (_, i) => {
        const x = lo + ((hi - lo) * i) / 79
        return [x, exGaussPdf(x, f.mu, f.sigma, f.tau) * xs.length * width]
      })
    : []
  const names = { hist: t('results.observed'), fit: t('results.exgFit') }
  return {
    animation: false,
    textStyle: ax.textStyle,
    grid: { left: 40, right: 16, top: 32, bottom: 30 },
    legend: {
      top: 0,
      left: 0,
      itemGap: 16,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: c.textSecondary, fontSize: 11 },
      data: f ? [names.hist, names.fit] : [names.hist],
    },
    tooltip: {
      ...tooltipBase(c),
      trigger: 'item',
      formatter: (p: { value: [number, number]; seriesName: string; color: string }) =>
        tooltipBox(c, `${n(p.value[0], 'integer')}–${n(p.value[0] + width, 'integer')} ms`, [
          { color: p.color, value: n(p.value[1], 'decimal1'), label: p.seriesName },
        ]),
    },
    xAxis: {
      type: 'value',
      min: lo,
      max: hi,
      axisLine: { lineStyle: { color: c.axis } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: c.muted, fontSize: 11, formatter: (v: number) => `${v}` },
      name: 'ms',
      nameTextStyle: { color: c.muted, fontSize: 11 },
    },
    yAxis: { ...ax.yValue, minInterval: 1 },
    series: [
      {
        name: names.hist,
        type: 'bar',
        data: bins.map((b) => [b.x0 + width / 2, b.count]),
        barWidth: '86%',
        barMaxWidth: 24,
        itemStyle: { color: c.series[0], borderRadius: [4, 4, 0, 0] },
      },
      ...(f
        ? [
            {
              name: names.fit,
              type: 'line',
              data: curve,
              symbol: 'none',
              silent: true,
              lineStyle: { width: 2, color: c.series[1] },
              itemStyle: { color: c.series[1] },
            },
          ]
        : []),
    ],
  }
})
</script>

<template>
  <div>
    <EChart :option="option" :height="220" :label="label" />
    <p v-if="fit" class="text-muted-foreground mt-1 text-xs tabular-nums">
      μ = {{ n(fit.mu, 'integer') }} ms · σ = {{ n(fit.sigma, 'integer') }} ms · τ =
      {{ n(fit.tau, 'integer') }} ms
    </p>
  </div>
</template>
