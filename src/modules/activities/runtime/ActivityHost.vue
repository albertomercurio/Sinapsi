<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { Pause, Play, Volume2 } from '@lucide/vue'
import { createRng, randomSeed } from '@/shared/lib/rng'
import { loadContentPack } from '@/content'
import { TrialRecorder, qualityFlags } from '@/modules/measurement'
import type { ActivityDefinition } from '../types'
import type { AgeGroup } from '../taxonomy'
import BaselineBlock from './BaselineBlock.vue'
import { hasLocalVoice, speak, stopSpeaking } from './speech'
import type { CompletedRun, PatientUiPrefs } from './types'

const props = defineProps<{
  activity: ActivityDefinition
  difficulty: number
  ageGroup: AgeGroup
  prefs?: PatientUiPrefs
  contentLocale?: string
  configOverrides?: Record<string, unknown>
  seed?: number
  /** Optional heading shown on the intro screen (e.g. "2 / 4"). */
  progressLabel?: string
}>()
const emit = defineEmits<{ complete: [run: CompletedRun]; next: [] }>()
const { t, te, locale } = useI18n()

type Phase = 'loading' | 'intro' | 'baseline' | 'countdown' | 'play' | 'done' | 'error'
const phase = ref<Phase>('loading')
const paused = ref(false)
const countdown = ref(3)
const stageEl = ref<HTMLElement | null>(null)
const instance = shallowRef<unknown>(null)
const result = shallowRef<CompletedRun | null>(null)
const errorMessage = ref<string | null>(null)
const seed = props.seed ?? randomSeed()
const recorder = new TrialRecorder({ sampleHz: 30 })
let baselineRt: number | null = null
let started = false

const kids = computed(() => props.prefs?.theme === 'kids' || props.ageGroup === 'child')
const config = computed(
  () =>
    props.activity.configSchema.parse({
      ...(props.activity.configFor(props.difficulty, props.ageGroup) as object),
      ...props.configOverrides,
    }) as Record<string, unknown>,
)
const Player = defineAsyncComponent(props.activity.player)
const name = computed(() => t(`activity.${props.activity.id}.name`))
const instructions = computed(() => {
  const kidsKey = `activity.${props.activity.id}.instructionsKids`
  return kids.value && te(kidsKey) ? t(kidsKey) : t(`activity.${props.activity.id}.instructions`)
})
const canSpeak = ref(false)

const surfaceClass = computed(() => ({
  'theme-kids': kids.value,
  'high-contrast': !!props.prefs?.high_contrast,
  'reduced-motion': !!props.prefs?.reduced_motion,
}))
const surfaceStyle = computed(() => ({ '--font-scale': String(props.prefs?.font_scale ?? 1) }))

const stars = computed(() => {
  const s = result.value?.result.score ?? 0
  return s >= 80 ? 3 : s >= 55 ? 2 : 1
})

onMounted(async () => {
  try {
    const content = await loadContentPack(props.contentLocale ?? String(locale.value))
    instance.value = props.activity.generate({
      rng: createRng(seed),
      config: config.value as never,
      difficulty: props.difficulty,
      ageGroup: props.ageGroup,
      locale: props.contentLocale ?? String(locale.value),
      content,
    })
    phase.value = 'intro'
    const lang = (props.contentLocale ?? String(locale.value)).slice(0, 2)
    canSpeak.value = hasLocalVoice(lang)
    if (props.prefs?.audio && canSpeak.value) speak(instructions.value, lang)
  } catch (e) {
    console.error(e)
    errorMessage.value = String(e)
    phase.value = 'error'
  }
})

onBeforeUnmount(() => {
  stopSpeaking()
  recorder.stop()
})

function readAloud() {
  speak(instructions.value, (props.contentLocale ?? String(locale.value)).slice(0, 2))
}

async function begin() {
  stopSpeaking()
  if (!started && stageEl.value) {
    recorder.start(stageEl.value)
    started = true
  }
  if (props.activity.needsMotorBaseline) {
    phase.value = 'baseline'
  } else {
    await runCountdown()
  }
}

async function onBaselineDone(median: number | null) {
  baselineRt = median
  await runCountdown()
}

async function runCountdown() {
  phase.value = 'countdown'
  for (countdown.value = 3; countdown.value > 0; countdown.value--) {
    await new Promise((r) => setTimeout(r, props.prefs?.reduced_motion ? 400 : 700))
  }
  phase.value = 'play'
  await nextTick()
}

function onPlayerDone() {
  const recording = recorder.finish()
  const scored = props.activity.score(instance.value as never, recording, {
    config: config.value as never,
    baselineRt,
  })
  const run: CompletedRun = {
    activityId: props.activity.id,
    activityVersion: props.activity.version,
    scoringVersion: props.activity.scoringVersion,
    difficulty: props.difficulty,
    seed,
    config: config.value,
    recording,
    result: scored,
    qualityFlags: [
      ...new Set([
        ...qualityFlags(recording, { minTrials: props.activity.minTrials }),
        ...(scored.flags ?? []),
      ]),
    ],
  }
  result.value = run
  phase.value = 'done'
  emit('complete', run)
}

function togglePause() {
  paused.value = !paused.value
  if (paused.value) recorder.pause()
  else recorder.resume()
}

defineExpose({ togglePause })
</script>

<template>
  <div
    class="patient-surface relative flex h-full min-h-[100dvh] flex-col select-none"
    :class="surfaceClass"
    :style="surfaceStyle"
  >
    <div v-if="phase === 'play' || phase === 'baseline'" class="absolute top-3 right-3 z-20">
      <button
        class="flex size-14 items-center justify-center rounded-full border-2 border-[var(--tile-border)] bg-[var(--tile)] shadow-sm"
        :aria-label="paused ? t('activities.runtime.resume') : t('activities.runtime.pause')"
        data-testid="pause-button"
        @click="togglePause"
      >
        <Play v-if="paused" class="size-7" />
        <Pause v-else class="size-7" />
      </button>
    </div>

    <div ref="stageEl" class="relative flex flex-1 flex-col" data-testid="activity-stage">
      <!-- Intro -->
      <div
        v-if="phase === 'intro'"
        class="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 p-6 text-center"
      >
        <p v-if="progressLabel" class="text-[0.9em] opacity-70">{{ progressLabel }}</p>
        <div class="text-[4.5em] leading-none" aria-hidden="true">{{ activity.icon }}</div>
        <h1 class="text-[1.8em] font-bold">{{ name }}</h1>
        <p
          class="max-w-2xl text-[1.25em] leading-relaxed whitespace-pre-line"
          data-testid="instructions"
        >
          {{ instructions }}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <button
            v-if="canSpeak"
            class="flex h-16 items-center gap-3 rounded-2xl border-2 border-[var(--tile-border)] bg-[var(--tile)] px-6 text-[1.1em]"
            @click="readAloud"
          >
            <Volume2 class="size-7" /> {{ t('activities.runtime.listen') }}
          </button>
          <button
            class="h-20 min-w-64 rounded-2xl bg-[var(--good)] px-10 text-[1.4em] font-bold text-white shadow-md active:scale-[0.98]"
            data-testid="start-activity"
            @click="begin"
          >
            {{ t('activities.runtime.start') }}
          </button>
        </div>
      </div>

      <BaselineBlock
        v-else-if="phase === 'baseline'"
        class="flex-1"
        :recorder="recorder"
        :paused="paused"
        :seed="seed"
        @done="onBaselineDone"
      />

      <div v-else-if="phase === 'countdown'" class="flex flex-1 items-center justify-center">
        <span class="text-[8em] font-bold tabular-nums" aria-live="assertive">{{ countdown }}</span>
      </div>

      <component
        :is="Player"
        v-else-if="phase === 'play'"
        class="flex-1"
        :instance="instance"
        :config="config"
        :recorder="recorder"
        :age-group="ageGroup"
        :kids="kids"
        :paused="paused"
        @done="onPlayerDone"
      />

      <div
        v-else-if="phase === 'done'"
        class="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center"
      >
        <div class="text-[4.5em] leading-none" aria-hidden="true">
          <span v-for="i in 3" :key="i" :class="i <= stars ? '' : 'opacity-20 grayscale'">⭐</span>
        </div>
        <h2 class="text-[1.8em] font-bold">{{ t(`activities.runtime.praise${stars}`) }}</h2>
        <button
          class="h-20 min-w-64 rounded-2xl bg-[var(--good)] px-10 text-[1.4em] font-bold text-white shadow-md"
          data-testid="next-activity"
          @click="emit('next')"
        >
          {{ t('activities.runtime.continue') }}
        </button>
      </div>

      <div
        v-else-if="phase === 'error'"
        class="flex flex-1 items-center justify-center p-6 text-center"
      >
        <p>{{ t('errors.generic') }}</p>
      </div>
    </div>

    <div
      v-if="paused"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-[var(--stage)]/95"
    >
      <p class="text-[2em] font-bold">{{ t('activities.runtime.paused') }}</p>
      <button
        class="h-20 min-w-64 rounded-2xl bg-[var(--good)] px-10 text-[1.4em] font-bold text-white"
        @click="togglePause"
      >
        {{ t('activities.runtime.resume') }}
      </button>
    </div>
  </div>
</template>
