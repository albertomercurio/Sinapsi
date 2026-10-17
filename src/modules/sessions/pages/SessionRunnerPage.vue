<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CloudOff, Loader2, LockKeyhole, Play } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { toast } from '@/shared/ui/toast'
import { supabase } from '@/shared/api/supabase'
import { errorKey, unwrap } from '@/shared/api/errors'
import type { Patient, SessionItem } from '@/shared/api/types'
import { getActivity } from '@/modules/activities/registry'
import { chooseDifficulty, type DifficultyChoice } from '@/modules/activities/adaptive'
import ActivityHost from '@/modules/activities/runtime/ActivityHost.vue'
import type { CompletedRun } from '@/modules/activities/runtime/types'
import { patientAgeGroup, patientPrefs } from '@/modules/patients/helpers'
import PatientLabel from '@/modules/patients/names/PatientLabel.vue'
import { fetchAbilities } from '@/modules/results/api'
import { useQueryClient } from '@tanstack/vue-query'
import { setSessionStatus, type SessionWithItems } from '../api'
import { saveCompletedRun } from '../runner/saveRun'
import { hasPin } from '../runner/pin'
import PinDialog from '../components/PinDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const qc = useQueryClient()
const sessionId = String(route.params.id)

const loading = ref(true)
const session = shallowRef<SessionWithItems | null>(null)
const patient = shallowRef<Patient | null>(null)
const choices = shallowRef<Map<string, DifficultyChoice>>(new Map())
const doneItems = ref<Set<string>>(new Set())
const phase = ref<'prepare' | 'patient' | 'finished'>('prepare')
const index = ref(0)
const saving = ref(0)
const failed = shallowRef<{ run: CompletedRun; item: SessionItem }[]>([])
const pinMode = ref<'set' | 'verify'>('verify')
const pinOpen = ref(false)
const unlocked = ref(false)
let pinAction: (() => void) | null = null
let lastSave: Promise<void> = Promise.resolve()

const items = computed(() => session.value?.session_items ?? [])
const todo = computed(() => items.value.filter((i) => !doneItems.value.has(i.id)))
const current = computed(() => todo.value[index.value] ?? null)
const currentActivity = computed(() =>
  current.value ? getActivity(current.value.activity_id) : undefined,
)
const prefs = computed(() => (patient.value ? patientPrefs(patient.value) : {}))
const ageGroup = computed(() => (patient.value ? patientAgeGroup(patient.value) : 'adult'))

async function load() {
  try {
    session.value = unwrap(
      await supabase.from('sessions').select('*, session_items(*)').eq('id', sessionId).single(),
    ) as unknown as SessionWithItems
    session.value.session_items.sort((a, b) => a.position - b.position)
    patient.value = unwrap(
      await supabase.from('patients').select('*').eq('id', session.value.patient_id).single(),
    )
    const runs = unwrap(
      await supabase.from('activity_runs').select('session_item_id').eq('session_id', sessionId),
    )
    doneItems.value = new Set(runs.map((r) => r.session_item_id).filter((x): x is string => !!x))
    await recomputeChoices()
    if (session.value.status === 'completed') phase.value = 'finished'
  } catch (e) {
    toast.error(t(errorKey(e)))
  } finally {
    loading.value = false
  }
}

async function recomputeChoices() {
  if (!patient.value || !session.value) return
  const abilities = await fetchAbilities(patient.value.id)
  const map = new Map<string, DifficultyChoice>()
  for (const item of session.value.session_items) {
    const stored = abilities.find((a) => a.activity_id === item.activity_id) ?? null
    map.set(
      item.id,
      chooseDifficulty({
        stored: stored as never,
        itemDifficulty: item.difficulty === null ? null : Number(item.difficulty),
        itemLocked: item.locked,
        targetSuccess: Number(patient.value.target_success),
      }),
    )
  }
  choices.value = map
}

function requirePin(action: () => void) {
  pinAction = action
  pinMode.value = hasPin() ? 'verify' : 'set'
  pinOpen.value = true
}

async function startPatientMode() {
  requirePin(async () => {
    if (session.value?.status === 'planned') await setSessionStatus(sessionId, 'in_progress')
    index.value = 0
    phase.value = 'patient'
    unlocked.value = false
    try {
      await document.documentElement.requestFullscreen?.()
    } catch {
      // fullscreen is optional
    }
  })
}

function onComplete(run: CompletedRun) {
  lastSave = persist(run)
}

async function persist(run: CompletedRun) {
  const item = current.value
  const choice = item ? choices.value.get(item.id) : undefined
  if (!item || !choice || !patient.value) return
  saving.value++
  try {
    await saveCompletedRun(run, {
      patientId: patient.value.id,
      sessionId,
      sessionItemId: item.id,
      mode: session.value!.mode,
      abilityBefore: choice.ability,
    })
  } catch (e) {
    console.error(e)
    failed.value = [...failed.value, { run, item }]
  } finally {
    saving.value--
  }
}

async function onNext() {
  const item = current.value
  if (item) doneItems.value = new Set([...doneItems.value, item.id])
  // Later items of the same activity adapt to the run just played.
  await lastSave
  await recomputeChoices().catch(() => undefined)
  index.value = 0
  if (!todo.value.length) await finish()
}

async function finish() {
  phase.value = 'finished'
  if (!failed.value.length) await setSessionStatus(sessionId, 'completed')
  void qc.invalidateQueries()
}

async function retryFailed() {
  const list = failed.value
  const stillFailing: typeof list = []
  for (const f of list) {
    try {
      const choice = choices.value.get(f.item.id)!
      await saveCompletedRun(f.run, {
        patientId: patient.value!.id,
        sessionId,
        sessionItemId: f.item.id,
        mode: session.value!.mode,
        abilityBefore: choice.ability,
      })
    } catch {
      stillFailing.push(f)
    }
  }
  failed.value = stillFailing
  if (!failed.value.length) {
    await setSessionStatus(sessionId, 'completed')
    toast.success(t('sessions.runner.savedAll'))
  }
}

/** Press and hold the lock for 1.5 s, then enter the PIN, to leave patient mode. */
let holdTimer: ReturnType<typeof setTimeout> | null = null
function holdStart() {
  holdTimer = setTimeout(() => requirePin(exitPatientMode), 1500)
}
function holdEnd() {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = null
}

async function exitPatientMode() {
  unlocked.value = true
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
  await router.push({
    name: 'patient',
    params: { id: patient.value!.id },
    query: { tab: 'results' },
  })
}

function onPin() {
  pinAction?.()
  pinAction = null
}

onBeforeRouteLeave(() => {
  if (phase.value !== 'patient' || unlocked.value) return true
  requirePin(exitPatientMode)
  return false
})

function beforeUnload(e: BeforeUnloadEvent) {
  if (phase.value === 'patient' || saving.value || failed.value.length) e.preventDefault()
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  void load()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <div class="min-h-dvh">
    <div v-if="loading" class="flex min-h-dvh items-center justify-center">
      <Loader2 class="size-8 animate-spin" />
    </div>

    <!-- Therapist: prepare -->
    <div
      v-else-if="phase === 'prepare' && session && patient"
      class="bg-background min-h-dvh px-4 py-8"
    >
      <div class="mx-auto grid max-w-3xl gap-6">
        <Button variant="ghost" class="w-fit" @click="router.back()"
          ><ArrowLeft /> {{ t('common.back') }}</Button
        >
        <Card>
          <CardHeader>
            <CardTitle class="text-xl">
              {{ session.title || t('sessions.untitled') }} ·
              <PatientLabel :patient="patient" />
            </CardTitle>
            <CardDescription>{{ t('sessions.runner.prepareHelp') }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <ol class="grid gap-2">
              <li
                v-for="(item, i) in items"
                :key="item.id"
                class="flex items-center gap-3 rounded-lg border p-3"
                :class="doneItems.has(item.id) ? 'opacity-50' : ''"
              >
                <span class="text-muted-foreground w-5 tabular-nums">{{ i + 1 }}</span>
                <span class="text-2xl">{{ getActivity(item.activity_id)?.icon }}</span>
                <span class="flex-1 font-medium">{{ t(`activity.${item.activity_id}.name`) }}</span>
                <Badge v-if="doneItems.has(item.id)" variant="success">{{
                  t('sessions.runner.done')
                }}</Badge>
                <template v-else-if="choices.get(item.id)">
                  <Badge variant="outline">{{
                    t('common.level', { n: choices.get(item.id)!.difficulty.toFixed(1) })
                  }}</Badge>
                  <span class="text-muted-foreground text-xs">{{
                    t(`sessions.runner.source.${choices.get(item.id)!.source}`)
                  }}</span>
                </template>
              </li>
            </ol>
            <Alert variant="info"
              ><LockKeyhole /><AlertDescription>{{
                t('sessions.runner.lockHelp')
              }}</AlertDescription></Alert
            >
            <Button
              size="lg"
              class="w-fit"
              :disabled="!todo.length"
              data-testid="start-patient-mode"
              @click="startPatientMode"
            >
              <Play /> {{ t('sessions.runner.startPatientMode') }}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Patient mode -->
    <div v-else-if="phase === 'patient' && current && currentActivity" class="relative h-dvh">
      <button
        class="absolute top-3 left-3 z-30 flex size-12 items-center justify-center rounded-full bg-black/5 opacity-60 hover:opacity-100"
        :aria-label="t('sessions.runner.exitHold')"
        data-testid="exit-patient-mode"
        @pointerdown="holdStart"
        @pointerup="holdEnd"
        @pointerleave="holdEnd"
        @contextmenu.prevent
      >
        <LockKeyhole class="size-5" />
      </button>
      <ActivityHost
        :key="current.id"
        :activity="currentActivity"
        :difficulty="choices.get(current.id)?.difficulty ?? 2"
        :age-group="ageGroup"
        :prefs="prefs"
        :content-locale="patient?.content_locale"
        :config-overrides="current.config as Record<string, unknown>"
        :progress-label="
          t('sessions.runner.progress', { n: items.length - todo.length + 1, total: items.length })
        "
        @complete="onComplete"
        @next="onNext"
      />
    </div>

    <!-- Finished -->
    <div
      v-else-if="phase === 'finished'"
      class="patient-surface flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center"
      :class="prefs.theme === 'kids' ? 'theme-kids' : ''"
    >
      <div class="text-[5em] leading-none">🎉</div>
      <h1 class="text-[2em] font-bold">{{ t('sessions.runner.finishedTitle') }}</h1>
      <p class="text-[1.2em]">{{ t('sessions.runner.finishedText') }}</p>
      <p v-if="saving" class="flex items-center gap-2 opacity-70">
        <Loader2 class="size-4 animate-spin" /> {{ t('sessions.runner.saving') }}
      </p>
      <div
        v-if="failed.length"
        class="bg-card text-foreground max-w-md rounded-xl border p-4 font-sans text-base"
      >
        <p class="mb-3 flex items-center gap-2">
          <CloudOff class="size-4" /> {{ t('sessions.runner.saveFailed', { n: failed.length }) }}
        </p>
        <Button @click="retryFailed">{{ t('sessions.runner.retry') }}</Button>
      </div>
      <button
        class="mt-6 flex items-center gap-2 rounded-full border-2 border-[var(--tile-border)] px-5 py-3 opacity-70"
        data-testid="exit-patient-mode"
        @pointerdown="holdStart"
        @pointerup="holdEnd"
        @pointerleave="holdEnd"
      >
        <LockKeyhole class="size-5" /> {{ t('sessions.runner.exitHold') }}
      </button>
    </div>

    <PinDialog v-model:open="pinOpen" :mode="pinMode" @ok="onPin" />
  </div>
</template>
