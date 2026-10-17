<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrialRecord, TrialRecorder } from '@/modules/measurement'
import { Staircase } from '@/modules/scoring'
import { ignoreCancel, usePausableClock } from '@/modules/activities/runtime/clock'
import { expectedAnswer, type Config, type Instance } from './logic'

const props = defineProps<{
  instance: Instance
  config: Config
  recorder: TrialRecorder
  kids: boolean
  paused: boolean
}>()
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()
const clock = usePausableClock(toRef(props, 'paused'))

const phase = ref<'watch' | 'answer' | 'feedback'>('watch')
const lit = ref<number | null>(null)
const shownDigit = ref<number | null>(null)
const entered = ref<number[]>([])
const feedback = ref<boolean | null>(null)
const trialIndex = ref(0)
const length = ref(props.config.startLength)
let trial: TrialRecord | null = null
let resolveAnswer: (() => void) | null = null

const side = computed(() => (props.config.gridSize === 16 ? 4 : 3))
const tiles = computed(() => Array.from({ length: props.config.gridSize }, (_, i) => i))

const staircase = new Staircase({
  start: props.config.startLength,
  min: props.config.minLength,
  max: props.config.maxLength,
  down: 3,
  up: 1,
})

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  try {
    for (let k = 0; k < props.config.trials; k++) {
      trialIndex.value = k
      length.value = staircase.value
      const seq = props.instance.pools[length.value]![k]!
      entered.value = []
      phase.value = 'watch'
      await clock.wait(700)
      for (const v of seq) {
        if (props.config.modality === 'spatial') lit.value = v
        else shownDigit.value = v
        await clock.wait(props.config.presentationMs)
        lit.value = null
        shownDigit.value = null
        await clock.wait(props.config.isiMs)
      }
      trial = props.recorder.beginTrial({ seq, length: seq.length }, { goAt: props.recorder.now() })
      props.recorder.setOnset(trial)
      phase.value = 'answer'
      await new Promise<void>((resolve) => (resolveAnswer = resolve))
      const answer = expectedAnswer(seq, props.config.direction)
      const ok = answer.every((v, i) => entered.value[i] === v)
      props.recorder.endTrial(trial, { correct: ok })
      staircase.record(ok)
      feedback.value = ok
      phase.value = 'feedback'
      await clock.wait(900)
      feedback.value = null
    }
    emit('done')
  } catch (e) {
    ignoreCancel(e)
  }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function choose(value: number, e?: PointerEvent) {
  if (phase.value !== 'answer' || !trial || props.paused) return
  if (e)
    props.recorder.pointerDown(trial, e, { target: value, targetEl: e.currentTarget as Element })
  entered.value = [...entered.value, value]
  if (props.config.modality === 'spatial') {
    lit.value = value
    setTimeout(() => (lit.value === value ? (lit.value = null) : null), 220)
  }
  if (entered.value.length >= length.value) resolveAnswer?.()
}

function onKey(e: KeyboardEvent) {
  if (props.config.modality !== 'digits' || phase.value !== 'answer' || !trial) return
  if (/^[0-9]$/.test(e.key)) {
    props.recorder.keyDown(trial, e, Number(e.key))
    choose(Number(e.key))
  }
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-6 p-4 pt-20"
    @pointerup="recorder.pointerUp($event)"
  >
    <p class="text-center text-[1.2em] font-semibold" aria-live="polite">
      <template v-if="phase === 'watch'">{{ t('activity.span-sequence.watch') }}</template>
      <template v-else-if="phase === 'answer'">
        {{
          config.direction === 'backward'
            ? t('activity.span-sequence.repeatBackward')
            : t('activity.span-sequence.repeat')
        }}
      </template>
      <template v-else>{{
        feedback ? t('activity.span-sequence.right') : t('activity.span-sequence.wrong')
      }}</template>
    </p>

    <!-- Spatial (Corsi-like) -->
    <div
      v-if="config.modality === 'spatial'"
      class="grid aspect-square w-[min(88vw,62vh)] gap-3"
      :style="{ gridTemplateColumns: `repeat(${side}, minmax(0, 1fr))` }"
    >
      <button
        v-for="i in tiles"
        :key="i"
        class="rounded-2xl border-4 transition-colors duration-150"
        :class="
          lit === i
            ? 'border-[var(--focus)] bg-[var(--tile-active)]'
            : 'border-[var(--tile-border)] bg-[var(--tile)]'
        "
        :disabled="phase !== 'answer'"
        data-testid="span-tile"
        :data-lit="lit === i ? '1' : '0'"
        @pointerdown="choose(i, $event)"
      >
        <span v-if="kids && lit === i" class="text-[2.5em]">⭐</span>
      </button>
    </div>

    <!-- Digits -->
    <template v-else>
      <div
        class="flex h-40 w-full max-w-md items-center justify-center rounded-3xl border-4 border-[var(--tile-border)] bg-[var(--tile)]"
      >
        <span
          v-if="shownDigit !== null"
          class="text-[6em] font-bold tabular-nums"
          data-testid="span-digit"
          >{{ shownDigit }}</span
        >
        <span v-else-if="phase !== 'watch'" class="font-mono text-[2.5em] tracking-[0.3em]">{{
          entered.join('') || '·'
        }}</span>
      </div>
      <div class="grid w-[min(90vw,26rem)] grid-cols-3 gap-3">
        <button
          v-for="d in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]"
          :key="d"
          class="h-20 rounded-2xl border-4 border-[var(--tile-border)] bg-[var(--tile)] text-[2em] font-bold"
          :class="d === 0 ? 'col-start-2' : ''"
          :disabled="phase !== 'answer'"
          data-testid="span-key"
          @pointerdown="choose(d, $event)"
        >
          {{ d }}
        </button>
      </div>
    </template>

    <p class="opacity-60">{{ trialIndex + 1 }} / {{ config.trials }}</p>
  </div>
</template>
