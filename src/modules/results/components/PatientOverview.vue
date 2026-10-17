<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CalendarPlus, Play } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import EmptyState from '@/shared/components/EmptyState.vue'
import type { Patient } from '@/shared/api/types'
import { ratingToLevel } from '@/modules/scoring'
import { usePatientSessions } from '@/modules/sessions/api'
import { usePatientAbilities, usePatientRuns } from '../api'
import {
  abilitySeries,
  analyzeMetric,
  filterRuns,
  metricSeries,
  playedActivities,
  summaryStats,
} from '../analysis'
import TrendSparkline from './TrendSparkline.vue'
import TrendBadge from './TrendBadge.vue'

const props = defineProps<{ patient: Patient }>()
const { t, n, d } = useI18n()
const router = useRouter()
const { data: runs, isLoading } = usePatientRuns(() => props.patient.id)
const { data: abilities } = usePatientAbilities(() => props.patient.id)
const { data: sessions } = usePatientSessions(() => props.patient.id)

const stats = computed(() => summaryStats(runs.value ?? []))
const next = computed(() =>
  (sessions.value ?? []).filter((s) => s.status === 'planned' || s.status === 'in_progress').at(-1),
)
const clean = computed(() =>
  filterRuns(runs.value ?? [], { sinceDays: null, input: null, excludeFlagged: true }),
)
const rows = computed(() =>
  playedActivities(runs.value ?? []).map(({ activity, primary }) => {
    const ab = abilities.value?.find((a) => a.activity_id === activity.id)
    const series = abilitySeries(clean.value, activity.id)
    const main = primary[0]
    const trend = main
      ? analyzeMetric(
          metricSeries(clean.value, activity.id, main.key),
          main.polarity,
          `${props.patient.id}:${activity.id}`,
        ).trend
      : null
    return {
      activity,
      level: ab ? ratingToLevel(Number(ab.rating)) : null,
      n: ab?.n_runs ?? series.length,
      spark: series.map((p) => p.level),
      main,
      trend,
    }
  }),
)
</script>

<template>
  <div class="grid gap-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="bg-card rounded-xl border p-4">
        <p class="text-muted-foreground text-xs">{{ t('results.stats.sessions') }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ stats.sessions }}</p>
      </div>
      <div class="bg-card rounded-xl border p-4">
        <p class="text-muted-foreground text-xs">{{ t('results.stats.runs') }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ stats.runs }}</p>
      </div>
      <div class="bg-card rounded-xl border p-4">
        <p class="text-muted-foreground text-xs">{{ t('results.stats.minutes') }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ stats.minutes }}</p>
      </div>
      <div class="bg-card rounded-xl border p-4">
        <p class="text-muted-foreground text-xs">{{ t('results.stats.last') }}</p>
        <p class="mt-1 text-lg font-semibold">
          {{ stats.last ? d(new Date(stats.last), 'medium') : '—' }}
        </p>
      </div>
    </div>

    <div class="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div>
        <p class="text-muted-foreground text-xs">{{ t('results.nextSession') }}</p>
        <p class="font-medium">
          {{
            next
              ? `${d(new Date(next.scheduled_for), 'long')} · ${next.title || t('sessions.untitled')}`
              : t('results.noNextSession')
          }}
        </p>
      </div>
      <Button
        v-if="next"
        data-testid="overview-run"
        @click="router.push({ name: 'session-run', params: { id: next.id } })"
        ><Play /> {{ t('sessions.start') }}</Button
      >
      <Button
        v-else
        variant="outline"
        @click="router.push({ name: 'session-new', query: { patient: patient.id } })"
        ><CalendarPlus /> {{ t('sessions.new') }}</Button
      >
    </div>

    <Skeleton v-if="isLoading" class="h-40" />
    <EmptyState
      v-else-if="!rows.length"
      :title="t('results.empty')"
      :description="t('results.emptyHint')"
    />
    <div v-else class="bg-card overflow-x-auto rounded-xl border">
      <table class="w-full text-sm">
        <thead class="text-muted-foreground text-left text-xs">
          <tr>
            <th class="p-3">{{ t('results.activityLabel') }}</th>
            <th class="p-3 text-right">{{ t('results.ability') }}</th>
            <th class="p-3">{{ t('results.abilityTrend') }}</th>
            <th class="hidden p-3 md:table-cell">{{ t('results.mainMetric') }}</th>
            <th class="p-3 text-right">{{ t('results.stats.runs') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.activity.id" class="border-t">
            <td class="p-3">
              <span class="mr-2 text-lg">{{ r.activity.icon }}</span
              >{{ t(`activity.${r.activity.id}.name`) }}
            </td>
            <td class="p-3 text-right font-semibold tabular-nums">
              {{ r.level === null ? '—' : `L${n(r.level, 'decimal1')}` }}
            </td>
            <td class="p-3"><TrendSparkline :values="r.spark" /></td>
            <td class="hidden p-3 md:table-cell">
              <span v-if="r.main" class="mr-2">{{ t(`metrics.${r.main.key}`) }}</span>
              <TrendBadge v-if="r.trend && r.main?.polarity !== 0" :direction="r.trend.direction" />
            </td>
            <td class="p-3 text-right tabular-nums">{{ r.n }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-muted-foreground text-xs">{{ t('results.ownHistoryNotice') }}</p>
  </div>
</template>
