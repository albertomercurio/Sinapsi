<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Pin, PinOff, Trash2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { errorKey } from '@/shared/api/errors'
import { getActivity } from '@/modules/activities/registry'
import RunMetricsTable from '@/modules/activities/components/RunMetricsTable.vue'
import { usePatient } from '@/modules/patients/api'
import { useAuthStore } from '@/modules/auth/store'
import { ratingToLevel } from '@/modules/scoring'
import { useDeleteRun, usePinRunEvents, useRun, useRunEvents } from '../api'
import TrialsChart from '../charts/TrialsChart.vue'
import RtDistributionChart from '../charts/RtDistributionChart.vue'
import ReplayView from '../components/ReplayView.vue'

const { t, d, n } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() => String(route.params.id))
const { data: run, isLoading } = useRun(id)
const { data: events, isLoading: eventsLoading } = useRunEvents(id)
const patientId = computed(() => run.value?.patient_id ?? '')
const { data: patient } = usePatient(patientId)
const pin = usePinRunEvents()
const del = useDeleteRun()
const deleteOpen = ref(false)

const activity = computed(() => (run.value ? getActivity(run.value.activity_id) : undefined))
const spatial = computed(() =>
  ['cancellation', 'trail-connect'].includes(run.value?.activity_id ?? ''),
)
const rts = computed(() =>
  (events.value?.recording.trials ?? [])
    .filter((tr) => tr.correct !== false && typeof tr.rt === 'number')
    .map((tr) => tr.rt as number),
)
const metrics = computed(() => (run.value?.metrics ?? {}) as Record<string, number | null>)
const device = computed(
  () =>
    (run.value?.device ?? {}) as {
      input?: string
      screenW?: number
      screenH?: number
      refreshHz?: number | null
    },
)

async function togglePin() {
  if (!events.value) return
  await pin.mutateAsync({ runId: id.value, pinned: !events.value.pinned })
}

async function confirmDelete() {
  if (!run.value) return
  try {
    await del.mutateAsync(run.value)
    await router.replace({
      name: 'patient',
      params: { id: run.value.patient_id },
      query: { tab: 'results' },
    })
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div v-if="isLoading"><Skeleton class="h-64" /></div>
  <div v-else-if="run && activity" class="grid gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Button
        variant="ghost"
        @click="
          router.push({
            name: 'patient',
            params: { id: run.patient_id },
            query: { tab: 'results' },
          })
        "
      >
        <ArrowLeft /> <span class="font-mono">{{ patient?.code }}</span>
      </Button>
      <Button
        v-if="auth.currentMembership?.role === 'owner'"
        variant="ghost"
        class="text-destructive"
        @click="deleteOpen = true"
        ><Trash2 /> {{ t('results.deleteRun') }}</Button
      >
    </div>
    <header>
      <h1 class="flex items-center gap-3 text-2xl font-semibold">
        <span class="text-3xl">{{ activity.icon }}</span> {{ t(`activity.${activity.id}.name`) }}
      </h1>
      <p class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
        {{ d(new Date(run.started_at), 'dateTime') }} ·
        {{ t('common.level', { n: n(Number(run.difficulty), 'decimal1') }) }} ·
        {{ n(run.duration_ms / 1000, 'decimal1') }} s · {{ t(`sessions.mode.${run.mode}`) }}
        <span v-if="device.input">· {{ t(`results.input.${device.input}`) }}</span>
        <span v-if="run.rating_after !== null"
          >·
          {{
            t('results.abilityAfter', { n: n(ratingToLevel(Number(run.rating_after)), 'decimal1') })
          }}</span
        >
        <Badge v-for="f in run.quality_flags" :key="f" variant="warning">{{
          t(`quality.${f}`)
        }}</Badge>
      </p>
    </header>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          ><CardTitle>{{ t('results.measures') }}</CardTitle></CardHeader
        >
        <CardContent>
          <RunMetricsTable
            :activity="activity"
            :metrics="metrics"
            :score="run.score === null ? null : Number(run.score)"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{{ t('results.rawTitle') }}</CardTitle>
          <CardDescription>
            <template v-if="events">{{
              events.pinned
                ? t('results.rawPinned')
                : t('results.rawExpires', {
                    date: events.expires_at ? d(new Date(events.expires_at), 'medium') : '—',
                  })
            }}</template>
            <template v-else-if="!eventsLoading">{{ t('results.rawPurged') }}</template>
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3">
          <dl class="text-muted-foreground grid grid-cols-2 gap-1 text-xs">
            <dt>{{ t('results.device') }}</dt>
            <dd class="tabular-nums">
              {{ device.screenW }}×{{ device.screenH }} ·
              {{ device.refreshHz ? `${device.refreshHz} Hz` : '—' }}
            </dd>
            <dt>{{ t('results.seed') }}</dt>
            <dd class="font-mono">{{ run.seed }}</dd>
            <dt>{{ t('results.versions') }}</dt>
            <dd>v{{ run.activity_version }} / scoring v{{ run.scoring_version }}</dd>
            <template v-if="events?.recording.baseline?.median">
              <dt>{{ t('metrics.baselineRt') }}</dt>
              <dd class="tabular-nums">{{ n(events.recording.baseline.median, 'integer') }} ms</dd>
            </template>
          </dl>
          <Button v-if="events" variant="outline" size="sm" class="w-fit" @click="togglePin">
            <component :is="events.pinned ? PinOff : Pin" />
            {{ events.pinned ? t('results.unpin') : t('results.pin') }}
          </Button>
        </CardContent>
      </Card>
    </div>

    <template v-if="events">
      <Card v-if="spatial">
        <CardHeader
          ><CardTitle>{{ t('results.replayTitle') }}</CardTitle></CardHeader
        >
        <CardContent
          ><ReplayView
            :run="run"
            :recording="events.recording"
            :birth-year="patient?.birth_year ?? null"
        /></CardContent>
      </Card>
      <div v-else-if="rts.length >= 5" class="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            ><CardTitle>{{ t('results.trialsTitle') }}</CardTitle
            ><CardDescription>{{ t('results.trialsSubtitle') }}</CardDescription></CardHeader
          >
          <CardContent
            ><TrialsChart :recording="events.recording" :label="t('results.trialsTitle')"
          /></CardContent>
        </Card>
        <Card>
          <CardHeader
            ><CardTitle>{{ t('results.distributionTitle') }}</CardTitle
            ><CardDescription>{{ t('results.distributionSubtitle') }}</CardDescription></CardHeader
          >
          <CardContent
            ><RtDistributionChart :rts="rts" :label="t('results.distributionTitle')"
          /></CardContent>
        </Card>
      </div>
    </template>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('results.deleteRunTitle')"
      :description="t('results.deleteRunText')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>
