<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrialRecord, TrialRecorder } from '@/modules/measurement'
import { ignoreCancel, usePausableClock } from '@/modules/activities/runtime/clock'
import type { Config, Instance } from './logic'

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

const k = ref(0)
const visible = ref(false)
const feedback = ref<'ok' | 'no' | null>(null)
let trial: TrialRecord | null = null
let resolveChoice: (() => void) | null = null

const item = computed(() => props.instance.items[k.value]!)
const bins = computed(() =>
  item.value.rule === 'size' ? props.instance.sizeBins : props.instance.categoryBins,
)
const cue = computed(() =>
  item.value.rule === 'size'
    ? t('activity.categorization.bySize')
    : t('activity.categorization.byCategory'),
)

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  try {
    for (let i = 0; i < props.instance.items.length; i++) {
      k.value = i
      await clock.wait(props.instance.items[i]!.switchTrial ? 1200 : 450)
      trial = props.recorder.beginTrial({ k: i, rule: props.instance.items[i]!.rule })
      visible.value = true
      await props.recorder.markOnset(trial)
      const deadline = clock.wait(props.config.responseWindowMs)
      await Promise.race([new Promise<void>((resolve) => (resolveChoice = resolve)), deadline])
      deadline.cancel()
      resolveChoice = null
      const choice = trial.responses[0] ? Number(trial.responses[0].target) : null
      const ok = choice === props.instance.items[i]!.answer
      props.recorder.endTrial(trial, { correct: ok })
      visible.value = false
      if (props.config.feedback) {
        feedback.value = ok ? 'ok' : 'no'
        await clock.wait(500)
        feedback.value = null
      }
      trial = null
    }
    emit('done')
  } catch (e) {
    ignoreCancel(e)
  }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function choose(bin: number, e?: PointerEvent) {
  if (!trial || !visible.value || props.paused || trial.responses.length) return
  if (e) props.recorder.pointerDown(trial, e, { target: bin, targetEl: e.currentTarget as Element })
  resolveChoice?.()
}

function onKey(e: KeyboardEvent) {
  const n = Number(e.key)
  if (!trial || !visible.value || !Number.isInteger(n) || n < 1 || n > bins.value.length) return
  props.recorder.keyDown(trial, e, n - 1)
  resolveChoice?.()
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-between gap-6 p-4 pt-20"
    @pointerup="recorder.pointerUp($event)"
  >
    <p
      v-if="config.rule === 'switch'"
      class="rounded-2xl border-4 border-[var(--focus)] bg-[var(--tile)] px-6 py-3 text-[1.3em] font-bold"
      :class="item.switchTrial ? 'animate-pulse' : ''"
      data-testid="categorization-cue"
    >
      {{ cue }}
    </p>
    <div class="flex flex-1 items-center justify-center">
      <div
        class="relative flex size-[min(40vh,18rem)] flex-col items-center justify-center gap-2 rounded-3xl border-4 border-[var(--tile-border)] bg-[var(--tile)]"
        data-testid="categorization-item"
      >
        <template v-if="visible">
          <span class="text-[min(20vh,8rem)] leading-none">{{ item.stimulus.emoji }}</span>
          <span v-if="config.showWord" class="text-[1.2em] font-semibold">{{ item.word }}</span>
        </template>
        <span v-if="feedback" class="absolute -top-4 -right-4 text-[3em]">{{
          feedback === 'ok' ? '✅' : '❌'
        }}</span>
      </div>
    </div>
    <div
      class="grid w-full max-w-4xl gap-3"
      :style="{ gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` }"
    >
      <button
        v-for="(bin, b) in bins"
        :key="bin.key"
        class="flex h-32 flex-col items-center justify-center gap-1 rounded-3xl border-4 border-[var(--tile-border)] bg-[var(--tile)] text-[1.15em] font-bold active:bg-[var(--tile-active)]"
        data-testid="categorization-bin"
        @pointerdown="choose(b, $event)"
      >
        <span class="text-[2em] leading-none">{{ bin.emoji }}</span>
        {{ bin.label }}
        <span class="text-[0.7em] font-normal opacity-50">{{ b + 1 }}</span>
      </button>
    </div>
  </div>
</template>
