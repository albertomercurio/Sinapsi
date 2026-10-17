<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ChartNoAxesCombined, Download, FileText } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { NativeSelect } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { Skeleton } from '@/shared/ui/skeleton'
import EmptyState from '@/shared/components/EmptyState.vue'
import { downloadBlob, toCsv } from '@/shared/lib/download'
import { supabase } from '@/shared/api/supabase'
import type { Patient } from '@/shared/api/types'
import { localDateString } from '@/modules/sessions/api'
import { usePatientAbilities, usePatientRuns } from '../api'
import {
  abilitySeries,
  domainComposites,
  domainProfile,
  filterRuns,
  metricSeries,
  playedActivities,
  runsPerDay,
  type RunFilter,
} from '../analysis'
import { formatMetric } from '../format'
import ChartCard from './ChartCard.vue'
import MetricCard from './MetricCard.vue'
import AbilityLock from './AbilityLock.vue'
import AbilityChart from '../charts/AbilityChart.vue'
import DomainChart from '../charts/DomainChart.vue'
import ProfileDumbbell from '../charts/ProfileDumbbell.vue'
import ActivityCalendar from '../charts/ActivityCalendar.vue'

const props = defineProps<{ patient: Patient }>()
const { t, n, d } = useI18n()
const router = useRouter()
const { data: allRuns, isLoading } = usePatientRuns(() => props.patient.id)
const { data: abilities } = usePatientAbilities(() => props.patient.id)

const filter = ref<RunFilter>({ sinceDays: null, input: null, excludeFlagged: true })
const activityFilter = ref<string | null>(null)
const showAllMetrics = ref<Record<string, boolean>>({})
const runLimit = ref(30)

const runs = computed(() => filterRuns(allRuns.value ?? [], filter.value))
const played = computed(() => playedActivities(allRuns.value ?? []))
const shown = computed(() =>
  played.value.filter((p) => !activityFilter.value || p.activity.id === activityFilter.value),
)

const profileFrom = ref('')
const profileTo = ref('')
watch(
  allRuns,
  (r) => {
    if (!r?.length) return
    profileFrom.value ||= localDateString(new Date(r[0]!.started_at))
    profileTo.value ||= localDateString(new Date(r.at(-1)!.started_at))
  },
  { immediate: true },
)
const profile = computed(() =>
  domainProfile(
    runs.value,
    new Date(`${profileFrom.value}T23:59:59`).getTime(),
    new Date(`${profileTo.value}T23:59:59`).getTime(),
  ),
)
const composites = computed(() => domainComposites(runs.value))
const calendar = computed(() => runsPerDay(allRuns.value ?? []))

const periodOptions = computed(() => [
  { value: null, label: t('results.period.all') },
  { value: 30, label: t('results.period.d30') },
  { value: 90, label: t('results.period.d90') },
  { value: 180, label: t('results.period.d180') },
  { value: 365, label: t('results.period.d365') },
])
const activityOptions = computed(() => [
  { value: null, label: t('results.allActivities') },
  ...played.value.map((p) => ({
    value: p.activity.id,
    label: t(`activity.${p.activity.id}.name`),
  })),
])
const inputOptions = computed(() => [
  { value: null, label: t('results.input.all') },
  ...(['mouse', 'touch', 'pen', 'keyboard'] as const).map((i) => ({
    value: i,
    label: t(`results.input.${i}`),
  })),
])

function open(runId: string) {
  void router.push({ name: 'run', params: { id: runId } })
}

async function exportCsv() {
  const rows = (allRuns.value ?? []).map((r) => ({
    date: r.started_at,
    activity: r.activity_id,
    difficulty: r.difficulty,
    score: r.score,
    performance: r.performance,
    duration_s: Math.round(r.duration_ms / 1000),
    mode: r.mode,
    input: (r.device as { input?: string })?.input ?? '',
    flags: r.quality_flags.join('|'),
    ability_level:
      r.rating_after === null ? '' : (3 + (Number(r.rating_after) - 1500) / 200).toFixed(2),
    ...(r.metrics as Record<string, unknown>),
  }))
  downloadBlob(
    new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }),
    `sinapsi-${props.patient.code}-runs.csv`,
  )
  await supabase.rpc('log_event', {
    p_org: props.patient.org_id,
    p_action: 'csv_export',
    p_entity: 'patients',
    p_entity_id: props.patient.id,
    p_details: { code: props.patient.code },
  })
}
</script>

<template>
  <div>
    <div v-if="isLoading" class="grid gap-4">
      <Skeleton class="h-12" /><Skeleton class="h-64" />
    </div>
    <EmptyState
      v-else-if="!allRuns?.length"
      :icon="ChartNoAxesCombined"
      :title="t('results.empty')"
      :description="t('results.emptyHint')"
    />
    <div v-else class="grid gap-6">
      <!-- One filter row above everything it scopes -->
      <div class="no-print flex flex-wrap items-end gap-3">
        <div class="grid gap-1">
          <Label class="text-xs">{{ t('results.periodLabel') }}</Label
          ><NativeSelect
            v-model="filter.sinceDays"
            :options="periodOptions"
            class="w-44"
            :aria-label="t('results.periodLabel')"
          />
        </div>
        <div class="grid gap-1">
          <Label class="text-xs">{{ t('results.activityLabel') }}</Label
          ><NativeSelect
            v-model="activityFilter"
            :options="activityOptions"
            class="w-56"
            :aria-label="t('results.activityLabel')"
          />
        </div>
        <div class="grid gap-1">
          <Label class="text-xs">{{ t('results.inputLabel') }}</Label
          ><NativeSelect
            v-model="filter.input"
            :options="inputOptions"
            class="w-40"
            :aria-label="t('results.inputLabel')"
          />
        </div>
        <label class="flex h-9 items-center gap-2 text-sm"
          ><Switch v-model="filter.excludeFlagged" /> {{ t('results.excludeFlagged') }}</label
        >
        <div class="ml-auto flex gap-2">
          <Button variant="outline" size="sm" @click="exportCsv"><Download /> CSV</Button>
          <Button
            variant="outline"
            size="sm"
            @click="router.push({ name: 'report', params: { id: patient.id } })"
            ><FileText /> {{ t('results.report') }}</Button
          >
        </div>
      </div>

      <section class="grid gap-4 xl:grid-cols-2">
        <ChartCard :title="t('results.domainTitle')" :subtitle="t('results.domainSubtitle')">
          <DomainChart
            v-if="composites.length"
            :series="composites"
            :label="t('results.domainTitle')"
          />
          <template #table>
            <table class="w-full">
              <thead>
                <tr class="text-muted-foreground text-left text-xs">
                  <th>{{ t('results.area') }}</th>
                  <th class="text-right">{{ t('results.latestChange') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in composites" :key="s.group" class="border-t">
                  <td class="py-1">{{ t(`activities.groups.${s.group}`) }}</td>
                  <td class="py-1 text-right tabular-nums">
                    {{ s.points.length ? n(s.points.at(-1)!.y, 'decimal2') : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </ChartCard>
        <ChartCard :title="t('results.profileTitle')" :subtitle="t('results.profileSubtitle')">
          <div class="no-print mb-2 flex flex-wrap items-center gap-2 text-xs">
            <Input
              v-model="profileFrom"
              type="date"
              class="h-8 w-40"
              :aria-label="t('results.compareFrom')"
            />
            <span>→</span>
            <Input
              v-model="profileTo"
              type="date"
              class="h-8 w-40"
              :aria-label="t('results.compareTo')"
            />
          </div>
          <ProfileDumbbell
            v-if="profile.length"
            :rows="profile"
            :from-label="profileFrom ? d(new Date(profileFrom), 'medium') : ''"
            :to-label="profileTo ? d(new Date(profileTo), 'medium') : ''"
            :label="t('results.profileTitle')"
          />
          <template #table>
            <table class="w-full">
              <thead>
                <tr class="text-muted-foreground text-left text-xs">
                  <th>{{ t('results.area') }}</th>
                  <th class="text-right">{{ profileFrom }}</th>
                  <th class="text-right">{{ profileTo }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in profile" :key="r.group" class="border-t">
                  <td class="py-1">{{ t(`activities.groups.${r.group}`) }}</td>
                  <td class="py-1 text-right tabular-nums">L{{ n(r.from, 'decimal1') }}</td>
                  <td class="py-1 text-right tabular-nums">L{{ n(r.to, 'decimal1') }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </ChartCard>
        <ChartCard
          class="xl:col-span-2"
          :title="t('results.calendarTitle')"
          :subtitle="t('results.calendarSubtitle')"
        >
          <ActivityCalendar :days="calendar" :label="t('results.calendarTitle')" />
          <template #table>
            <table class="w-full">
              <thead>
                <tr class="text-muted-foreground text-left text-xs">
                  <th>{{ t('common.date') }}</th>
                  <th class="text-right">{{ t('results.runs') }}</th>
                  <th class="text-right">{{ t('results.minutes') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in [...calendar].reverse()" :key="row[0]" class="border-t">
                  <td class="py-1">{{ d(new Date(row[0]), 'medium') }}</td>
                  <td class="py-1 text-right">{{ row[1] }}</td>
                  <td class="py-1 text-right">{{ row[2] }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </ChartCard>
      </section>

      <section
        v-for="{ activity, primary } in shown"
        :key="activity.id"
        class="grid gap-4"
        data-testid="activity-results"
      >
        <header class="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <h2 class="flex items-center gap-2 text-lg font-semibold">
            <span class="text-2xl">{{ activity.icon }}</span>
            {{ t(`activity.${activity.id}.name`) }}
          </h2>
          <AbilityLock
            :patient-id="patient.id"
            :activity-id="activity.id"
            :ability="abilities?.find((a) => a.activity_id === activity.id)"
          />
        </header>
        <ChartCard :title="t('results.abilityTitle')" :subtitle="t('results.abilitySubtitle')">
          <AbilityChart
            :points="abilitySeries(runs, activity.id)"
            :label="t('results.abilityTitle')"
            @open="open"
          />
          <template #table>
            <table class="w-full">
              <thead>
                <tr class="text-muted-foreground text-left text-xs">
                  <th>{{ t('common.date') }}</th>
                  <th class="text-right">{{ t('results.ability') }}</th>
                  <th class="text-right">{{ t('results.interval95') }}</th>
                  <th class="text-right">{{ t('results.playedDifficulty') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in [...abilitySeries(runs, activity.id)].reverse()"
                  :key="p.runId"
                  class="border-t"
                >
                  <td class="py-1">{{ d(new Date(p.t), 'dateTime') }}</td>
                  <td class="py-1 text-right tabular-nums">L{{ n(p.level, 'decimal1') }}</td>
                  <td class="py-1 text-right tabular-nums">
                    L{{ n(p.lo, 'decimal1') }}–{{ n(p.hi, 'decimal1') }}
                  </td>
                  <td class="py-1 text-right tabular-nums">L{{ n(p.difficulty, 'decimal1') }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </ChartCard>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            v-for="m in showAllMetrics[activity.id] ? activity.metrics : primary"
            :key="m.key"
            :metric="m"
            :points="metricSeries(runs, activity.id, m.key)"
            :seed="`${patient.id}:${activity.id}:${m.key}`"
            @open="open"
          />
        </div>
        <Button
          variant="link"
          class="w-fit px-0"
          @click="showAllMetrics[activity.id] = !showAllMetrics[activity.id]"
        >
          {{
            showAllMetrics[activity.id]
              ? t('results.fewerMetrics')
              : t('results.moreMetrics', { n: activity.metrics.length - primary.length })
          }}
        </Button>
      </section>

      <section class="border-t pt-6">
        <h2 class="mb-3 text-lg font-semibold">{{ t('results.runList') }}</h2>
        <div class="bg-card overflow-x-auto rounded-xl border">
          <table class="w-full text-sm">
            <thead class="text-muted-foreground text-left text-xs">
              <tr>
                <th class="p-2">{{ t('common.date') }}</th>
                <th class="p-2">{{ t('results.activityLabel') }}</th>
                <th class="p-2 text-right">{{ t('common.difficulty') }}</th>
                <th class="p-2 text-right">{{ t('metrics.score') }}</th>
                <th class="p-2">{{ t('results.quality') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in [...(allRuns ?? [])].reverse().slice(0, runLimit)"
                :key="r.id"
                class="hover:bg-muted/50 cursor-pointer border-t"
                data-testid="run-row"
                @click="open(r.id)"
              >
                <td class="p-2 whitespace-nowrap">{{ d(new Date(r.started_at), 'dateTime') }}</td>
                <td class="p-2">{{ t(`activity.${r.activity_id}.name`) }}</td>
                <td class="p-2 text-right tabular-nums">
                  L{{ n(Number(r.difficulty), 'decimal1') }}
                </td>
                <td class="p-2 text-right tabular-nums">
                  {{
                    r.score === null ? '—' : formatMetric(Number(r.score), 'count', n as never, t)
                  }}
                </td>
                <td class="p-2">
                  <Badge v-for="f in r.quality_flags" :key="f" variant="warning" class="mr-1">{{
                    t(`quality.${f}`)
                  }}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button
          v-if="(allRuns?.length ?? 0) > runLimit"
          variant="link"
          class="px-0"
          @click="runLimit += 60"
        >
          {{ t('results.moreRuns', { n: (allRuns?.length ?? 0) - runLimit }) }}
        </Button>
      </section>
    </div>
  </div>
</template>
