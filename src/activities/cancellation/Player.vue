<script setup lang="ts">
import { computed, onMounted, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrialRecord, TrialRecorder } from '@/modules/measurement'
import { ignoreCancel, usePausableClock } from '@/modules/activities/runtime/clock'
import { STAGE, type Config, type Instance } from './logic'

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
const marked = ref<Set<number>>(new Set())
const remaining = ref(props.config.timeLimitS)
const svgEl = ref<SVGSVGElement | null>(null)
let trial: TrialRecord | null = null
let finished = false

const emojiSet = computed(() => /\p{Extended_Pictographic}/u.test(props.instance.target))

onMounted(async () => {
  trial = props.recorder.beginTrial({ kind: 'search' }, { svgRect: svgRect() })
  await props.recorder.markOnset(trial)
  try {
    while (remaining.value > 0 && !finished) {
      await clock.wait(1000)
      remaining.value--
    }
    finish()
  } catch (e) {
    ignoreCancel(e)
  }
})

/** Where the logical stage sits inside the recorder's stage (to map the pointer trace for replay). */
function svgRect() {
  const r = svgEl.value?.getBoundingClientRect()
  if (!r) return null
  const o = props.recorder.toStage(r.left, r.top)
  return {
    x: Math.round(o.x),
    y: Math.round(o.y),
    width: Math.round(r.width),
    height: Math.round(r.height),
  }
}

function tap(i: number, e: PointerEvent) {
  if (!trial || props.paused || finished) return
  props.recorder.pointerDown(trial, e, { target: i, targetEl: e.currentTarget as Element })
  const next = new Set(marked.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  marked.value = next
}

function finish() {
  if (finished || !trial) return
  finished = true
  props.recorder.endTrial(trial, {})
  emit('done')
}
</script>

<template>
  <div
    class="flex flex-col gap-3 p-3 pt-20 sm:p-6 sm:pt-20"
    @pointerup="recorder.pointerUp($event)"
  >
    <div class="flex flex-wrap items-center justify-center gap-4 text-[1.1em]">
      <span>{{ t('activity.cancellation.find') }}</span>
      <span
        class="inline-flex size-16 items-center justify-center rounded-xl border-4 border-[var(--focus)] bg-[var(--tile)] text-[2em] font-bold"
        data-testid="cancellation-target"
        >{{ instance.target }}</span
      >
    </div>
    <div class="mx-auto w-full max-w-[calc((100dvh-15rem)*1.5625)] flex-1">
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${STAGE.width} ${STAGE.height}`"
        class="h-auto w-full touch-manipulation rounded-2xl border-4 border-[var(--tile-border)] bg-[var(--tile)]"
        role="group"
        :aria-label="t('activity.cancellation.name')"
      >
        <g
          v-for="(item, i) in instance.items"
          :key="i"
          class="cursor-pointer"
          data-testid="cancellation-item"
          :data-target="item.target ? '1' : '0'"
          @pointerdown="tap(i, $event)"
        >
          <circle :cx="item.x" :cy="item.y" :r="instance.radius" fill="transparent" />
          <text
            :x="item.x"
            :y="item.y"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="instance.radius * (emojiSet ? 1.25 : 1.4)"
            :transform="item.rotate ? `rotate(${item.rotate} ${item.x} ${item.y})` : undefined"
            class="fill-current font-bold"
            :class="emojiSet ? '' : 'font-[family-name:var(--font-legible)]'"
          >
            {{ item.glyph }}
          </text>
          <circle
            v-if="marked.has(i)"
            :cx="item.x"
            :cy="item.y"
            :r="instance.radius * 0.95"
            fill="none"
            stroke="var(--focus)"
            stroke-width="6"
          />
        </g>
      </svg>
    </div>
    <div class="flex items-center justify-center gap-6">
      <span class="tabular-nums opacity-70" aria-live="off"
        >⏱ {{ Math.floor(remaining / 60) }}:{{ String(remaining % 60).padStart(2, '0') }}</span
      >
      <button
        class="h-16 rounded-2xl bg-[var(--good)] px-8 text-[1.2em] font-bold text-white"
        data-testid="cancellation-done"
        @click="finish"
      >
        {{ t('activity.cancellation.done') }}
      </button>
    </div>
  </div>
</template>
