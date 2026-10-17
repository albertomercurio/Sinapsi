import { onBeforeUnmount, ref } from 'vue'

/**
 * Chart tokens, light and dark selected separately (validated with the dataviz
 * palette validator against the app's card surfaces: #ffffff and #131b26).
 * Categorical slots are used in fixed order and follow the entity.
 */
export const CHART_TOKENS = {
  light: {
    surface: '#ffffff',
    textPrimary: '#1b2433',
    textSecondary: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    band: 'rgba(11,11,11,0.035)',
    series: [
      '#2a78d6',
      '#eb6834',
      '#1baf7a',
      '#eda100',
      '#e87ba4',
      '#008300',
      '#6250d6',
      '#e34948',
    ],
    other: '#898781',
    sequential: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
    status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
    successText: '#006300',
  },
  dark: {
    surface: '#131b26',
    textPrimary: '#f0efec',
    textSecondary: '#c3c2b7',
    muted: '#898781',
    grid: 'rgba(255,255,255,0.08)',
    axis: 'rgba(255,255,255,0.18)',
    band: 'rgba(255,255,255,0.03)',
    series: [
      '#3987e5',
      '#d95926',
      '#199e70',
      '#c98500',
      '#d55181',
      '#008300',
      '#9085e9',
      '#e66767',
    ],
    other: '#898781',
    sequential: ['#1c2a3d', '#184f95', '#1c5cab', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'],
    status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
    successText: '#0ca30c',
  },
} as const

export type ChartTokens = (typeof CHART_TOKENS)['light'] | (typeof CHART_TOKENS)['dark']

/** Reactive tokens that follow the `.dark` class on <html>. */
export function useChartTokens() {
  const isDark = () => document.documentElement.classList.contains('dark')
  const tokens = ref<ChartTokens>(isDark() ? CHART_TOKENS.dark : CHART_TOKENS.light)
  const obs = new MutationObserver(() => {
    tokens.value = isDark() ? CHART_TOKENS.dark : CHART_TOKENS.light
  })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  onBeforeUnmount(() => obs.disconnect())
  return tokens
}

/** Shared axis/grid styling: hairline, solid, recessive. */
export function baseAxes(tk: ChartTokens) {
  const axisLabel = {
    color: tk.muted,
    fontFamily: 'Inter Variable, system-ui, sans-serif',
    fontSize: 11,
  }
  return {
    xTime: {
      type: 'time' as const,
      axisLine: { lineStyle: { color: tk.axis, width: 1 } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { ...axisLabel, hideOverlap: true },
    },
    yValue: {
      type: 'value' as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: tk.grid, width: 1, type: 'solid' as const } },
      axisLabel,
    },
    textStyle: { fontFamily: 'Inter Variable, system-ui, sans-serif', color: tk.textSecondary },
  }
}
