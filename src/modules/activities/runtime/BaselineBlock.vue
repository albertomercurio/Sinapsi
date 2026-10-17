<script setup lang="ts">
import { onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { createRng } from '@/shared/lib/rng'
import { median } from '@/modules/scoring'
import type { TrialRecorder } from '@/modules/measurement'
import { ignoreCancel, usePausableClock } from './clock'

/**
 * Simple reaction-time warm-up: press as soon as the circle appears (random
 * 800–2000 ms foreperiod). Its median estimates motor + device latency, so
 * choice RTs can be decomposed into "decision time" = RT − baseline.
 */
const props = defineProps<{
  recorder: TrialRecorder
  paused: boolean
  trials?: number
  seed: number
}>()
const emit = defineEmits<{ done: [median: number | null] }>()
const { t } = useI18n()
const clock = usePausableClock(toRef(props, 'paused'))
const visible = ref(false)
const count = ref(0)
let current: ReturnType<TrialRecorder['beginTrial']> | null = null
const rts: number[] = []

onMounted(async () => {
  const rng = createRng(props.seed).fork('baseline')
  const n = props.trials ?? 6
  try {
    await clock.wait(800)
    for (let i = 0; i < n; i++) {
      await clock.wait(rng.int(800, 2000))
      current = props.recorder.beginTrial({ baseline: true } as never)
      visible.value = true
      await props.recorder.markOnset(current)
      const start = performance.now()
      while (current && current.responses.length === 0 && performance.now() - start < 3000) {
        await clock.wait(20)
      }
      if (current?.rt != null && current.rt >= 100) rts.push(current.rt)
      visible.value = false
      current = null
      count.value = i + 1
    }
    // Baseline trials are not part of the task itself.
    props.recorder.clearTrials()
    props.recorder.setBaseline(rts, median(rts))
    emit('done', median(rts))
  } catch (e) {
    ignoreCancel(e)
  }
})

function press(e: PointerEvent) {
  if (current && visible.value) {
    props.recorder.pointerDown(current, e, { target: 'baseline' })
    visible.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-8 p-6" @pointerdown="press">
    <p class="text-center text-[1.3em]">{{ t('activities.runtime.baselineInstructions') }}</p>
    <div
      class="flex size-56 items-center justify-center rounded-full border-4 border-dashed border-[var(--tile-border)]"
    >
      <div
        v-if="visible"
        class="size-44 rounded-full bg-[var(--good)]"
        data-testid="baseline-target"
      />
    </div>
    <p class="opacity-70">{{ count }} / {{ trials ?? 6 }}</p>
  </div>
</template>
