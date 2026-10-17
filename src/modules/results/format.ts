import type { MetricDescriptor, MetricUnit } from '@/modules/activities/types'

type N = (value: number, key: string) => string

/** Formats a metric value with its unit, using vue-i18n's number formats. */
export function formatMetric(
  value: number | null | undefined,
  unit: MetricUnit,
  n: N,
  t: (k: string) => string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  switch (unit) {
    case 'ms':
      return `${n(value, 'integer')} ${t('units.ms')}`
    case 'seconds':
      return `${n(value, 'decimal1')} ${t('units.seconds')}`
    case 'percent':
      return n(value, 'percent')
    case 'count':
      return n(value, 'integer')
    case 'span':
      return n(value, 'decimal1')
    case 'perMin':
      return `${n(value, 'decimal1')}${t('units.perMin')}`
    case 'ratio':
    case 'index':
    default:
      return n(value, 'decimal2')
  }
}

export function metricLabelKey(m: Pick<MetricDescriptor, 'key' | 'labelKey'>): string {
  return m.labelKey ?? `metrics.${m.key}`
}
