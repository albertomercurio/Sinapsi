<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Printer } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { NativeSelect } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import BrandMark from '@/shared/components/BrandMark.vue'
import { supabase } from '@/shared/api/supabase'
import { useAuthStore } from '@/modules/auth/store'
import { usePatient } from '@/modules/patients/api'
import { patientAge, patientAgeGroup } from '@/modules/patients/helpers'
import { usePatientRuns } from '../api'
import {
  abilitySeries,
  analyzeMetric,
  domainComposites,
  filterRuns,
  metricSeries,
  playedActivities,
  summaryStats,
} from '../analysis'
import { formatMetric, metricLabelKey } from '../format'
import AbilityChart from '../charts/AbilityChart.vue'
import DomainChart from '../charts/DomainChart.vue'
import TrendBadge from '../components/TrendBadge.vue'

const { t, d, n } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() => String(route.params.id))
const { data: patient } = usePatient(id)
const { data: allRuns } = usePatientRuns(id)
const sinceDays = ref<number | null>(90)
const notes = ref('')

const runs = computed(() =>
  filterRuns(allRuns.value ?? [], {
    sinceDays: sinceDays.value,
    input: null,
    excludeFlagged: true,
  }),
)
const stats = computed(() => summaryStats(runs.value))
const activities = computed(() =>
  playedActivities(runs.value).map(({ activity, primary }) => {
    const ability = abilitySeries(runs.value, activity.id)
    return {
      activity,
      ability,
      metrics: primary.map((m) => {
        const pts = metricSeries(runs.value, activity.id, m.key)
        return {
          m,
          last: pts.at(-1)?.y ?? null,
          first: pts[0]?.y ?? null,
          trend: analyzeMetric(pts, m.polarity, `${id.value}:${activity.id}:${m.key}`).trend,
        }
      }),
    }
  }),
)
const periodOptions = computed(() => [
  { value: 30, label: t('results.period.d30') },
  { value: 90, label: t('results.period.d90') },
  { value: 180, label: t('results.period.d180') },
  { value: 365, label: t('results.period.d365') },
  { value: null, label: t('results.period.all') },
])

onMounted(async () => {
  const p = (await supabase.from('patients').select('org_id, code').eq('id', id.value).single())
    .data
  if (p)
    await supabase.rpc('log_event', {
      p_org: p.org_id,
      p_action: 'print_report',
      p_entity: 'patients',
      p_entity_id: id.value,
      p_details: { code: p.code },
    })
})

function printNow() {
  window.print()
}
</script>

<template>
  <div class="bg-muted/40 min-h-dvh print:bg-white">
    <div class="no-print mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-4 py-4">
      <Button variant="ghost" @click="router.back()"><ArrowLeft /> {{ t('common.back') }}</Button>
      <NativeSelect
        v-model="sinceDays"
        :options="periodOptions"
        class="w-48"
        :aria-label="t('results.periodLabel')"
      />
      <Button class="ml-auto" @click="printNow"><Printer /> {{ t('common.print') }}</Button>
    </div>
    <article
      v-if="patient"
      class="bg-card mx-auto grid max-w-[210mm] gap-6 p-[14mm] shadow-sm print:p-0 print:shadow-none"
    >
      <header class="flex items-start justify-between gap-6 border-b pb-4">
        <div>
          <BrandMark />
          <h1 class="mt-4 text-xl font-semibold">{{ t('results.reportTitle') }}</h1>
          <p class="text-muted-foreground text-sm">
            {{ sinceDays ? t('results.reportPeriod', { n: sinceDays }) : t('results.period.all') }}
            · {{ t('results.generatedOn', { date: d(new Date(), 'medium') }) }}
          </p>
        </div>
        <div class="text-right text-sm">
          <p class="font-mono text-2xl font-bold">{{ patient.code }}</p>
          <p class="text-muted-foreground">
            <template v-if="patientAge(patient) !== null"
              >{{ t('patients.ageYears', { n: patientAge(patient) }) }} · </template
            >{{ t(`common.ageGroups.${patientAgeGroup(patient)}`) }}
          </p>
          <p class="text-muted-foreground">{{ auth.displayName }}</p>
        </div>
      </header>

      <section class="grid grid-cols-4 gap-3 text-sm">
        <div>
          <p class="text-muted-foreground text-xs">{{ t('results.stats.sessions') }}</p>
          <p class="text-xl font-semibold">{{ stats.sessions }}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">{{ t('results.stats.runs') }}</p>
          <p class="text-xl font-semibold">{{ stats.runs }}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">{{ t('results.stats.minutes') }}</p>
          <p class="text-xl font-semibold">{{ stats.minutes }}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">{{ t('results.stats.activeDays') }}</p>
          <p class="text-xl font-semibold">{{ stats.activeDays }}</p>
        </div>
      </section>

      <section v-if="runs.length" class="break-inside-avoid">
        <h2 class="mb-2 font-semibold">{{ t('results.domainTitle') }}</h2>
        <DomainChart :series="domainComposites(runs)" :label="t('results.domainTitle')" />
      </section>

      <section v-for="a in activities" :key="a.activity.id" class="grid break-inside-avoid gap-3">
        <h2 class="flex items-center gap-2 font-semibold">
          <span>{{ a.activity.icon }}</span> {{ t(`activity.${a.activity.id}.name`) }}
        </h2>
        <AbilityChart :points="a.ability" :label="t('results.abilityTitle')" />
        <table class="w-full text-sm">
          <thead class="text-muted-foreground text-left text-xs">
            <tr>
              <th class="py-1">{{ t('results.measure') }}</th>
              <th class="py-1 text-right">{{ t('results.first') }}</th>
              <th class="py-1 text-right">{{ t('results.latest') }}</th>
              <th class="py-1 pl-4">{{ t('results.trendLabel') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in a.metrics" :key="row.m.key" class="border-t">
              <td class="py-1">{{ t(metricLabelKey(row.m)) }}</td>
              <td class="py-1 text-right tabular-nums">
                {{ formatMetric(row.first, row.m.unit, n as never, t) }}
              </td>
              <td class="py-1 text-right tabular-nums">
                {{ formatMetric(row.last, row.m.unit, n as never, t) }}
              </td>
              <td class="py-1 pl-4">
                <TrendBadge v-if="row.m.polarity !== 0" :direction="row.trend.direction" />
              </td>
            </tr>
            <tr v-if="a.ability.length" class="border-t font-medium">
              <td class="py-1">{{ t('results.ability') }}</td>
              <td class="py-1 text-right tabular-nums">
                L{{ n(a.ability[0]!.level, 'decimal1') }}
              </td>
              <td class="py-1 text-right tabular-nums">
                L{{ n(a.ability.at(-1)!.level, 'decimal1') }}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      <section class="break-inside-avoid">
        <h2 class="mb-2 font-semibold">{{ t('results.reportNotes') }}</h2>
        <Textarea
          v-model="notes"
          rows="5"
          class="print:border-0 print:p-0"
          :placeholder="t('results.reportNotesHint')"
        />
      </section>

      <footer class="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
        {{ t('results.reportDisclaimer') }}
      </footer>
    </article>
  </div>
</template>
