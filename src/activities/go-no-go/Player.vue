<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrialRecord, TrialRecorder } from '@/modules/measurement'
import { ignoreCancel, usePausableClock } from '@/modules/activities/runtime/clock'
import { STIMULI, type Config, type Instance } from './logic'

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

const shown = ref<'go' | 'nogo' | null>(null)
const index = ref(0)
const flash = ref(false)
let current: TrialRecord | null = null
let accepting = false

const glyphs = STIMULI[props.config.stimulusSet]

function respond(e: PointerEvent | KeyboardEvent) {
  if (!current || !accepting || props.paused) return
  if (current.responses.length) return
  if ('pointerId' in e) props.recorder.pointerDown(current, e, { target: 'button' })
  else props.recorder.keyDown(current, e, 'key')
  flash.value = true
  setTimeout(() => (flash.value = false), 120)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault()
    respond(e)
  }
}
function onKeyUp(e: KeyboardEvent) {
  props.recorder.keyUp(e)
}
function onPointerUp(e: PointerEvent) {
  props.recorder.pointerUp(e)
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  try {
    for (let i = 0; i < props.instance.trials.length; i++) {
      const trial = props.instance.trials[i]!
      index.value = i
      await clock.wait(trial.isiMs)
      current = props.recorder.beginTrial({ kind: trial.kind })
      shown.value = trial.kind
      accepting = true
      await props.recorder.markOnset(current)
      await clock.wait(props.config.stimulusMs)
      shown.value = null
      const remaining = props.config.responseWindowMs - props.config.stimulusMs
      if (remaining > 0) await clock.wait(remaining)
      accepting = false
      const responded = current.responses.length > 0
      props.recorder.endTrial(current, { correct: trial.kind === 'go' ? responded : !responded })
      current = null
    }
    emit('done')
  } catch (e) {
    ignoreCancel(e)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div class="flex flex-col items-center justify-between gap-6 p-6" @pointerup="onPointerUp">
    <div
      class="h-2 w-full max-w-xl overflow-hidden rounded-full bg-[var(--tile-border)]/40"
      aria-hidden="true"
    >
      <div
        class="h-full bg-[var(--focus)] transition-all"
        :style="{ width: `${(index / instance.trials.length) * 100}%` }"
      />
    </div>
    <div class="flex flex-1 items-center justify-center">
      <div
        class="flex size-[min(46vh,22rem)] items-center justify-center rounded-3xl border-4 border-[var(--tile-border)] bg-[var(--tile)]"
        data-testid="gng-stimulus"
        :data-kind="shown ?? ''"
      >
        <span v-if="shown" class="text-[min(28vh,13rem)] leading-none">{{ glyphs[shown] }}</span>
      </div>
    </div>
    <div class="flex flex-col items-center gap-3">
      <p class="text-center text-[1em] opacity-80">
        {{ t('activity.go-no-go.reminder', { go: glyphs.go, nogo: glyphs.nogo }) }}
      </p>
      <button
        class="h-28 w-[min(90vw,32rem)] rounded-3xl text-[1.6em] font-bold text-white shadow-md transition-transform"
        :class="flash ? 'scale-95 bg-[var(--focus)]' : 'bg-[var(--good)]'"
        data-testid="gng-button"
        @pointerdown="respond"
      >
        {{ t('activity.go-no-go.press') }}
      </button>
    </div>
  </div>
</template>
