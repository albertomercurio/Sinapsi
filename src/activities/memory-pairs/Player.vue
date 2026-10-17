<script setup lang="ts">
import { computed, onMounted, ref, toRef } from 'vue'
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
const clock = usePausableClock(toRef(props, 'paused'))

const faceUp = ref<Set<number>>(new Set())
const matched = ref<Set<number>>(new Set())
const busy = ref(true)
const wrong = ref<Set<number>>(new Set())
let trial: TrialRecord | null = null
let first: number | null = null

const total = props.instance.cards.length
const cols = computed(() => `repeat(${props.instance.columns}, minmax(0, 1fr))`)

onMounted(async () => {
  try {
    if (props.config.previewMs > 0) {
      faceUp.value = new Set(props.instance.cards.map((c) => c.index))
      await clock.wait(props.config.previewMs)
      faceUp.value = new Set()
      await clock.wait(300)
    }
    busy.value = false
  } catch (e) {
    ignoreCancel(e)
  }
})

async function flip(index: number, e: PointerEvent) {
  if (busy.value || props.paused || faceUp.value.has(index) || matched.value.has(index)) return
  if (first === null) {
    trial = props.recorder.beginTrial({ kind: 'attempt' })
    props.recorder.setOnset(trial)
    first = index
    props.recorder.pointerDown(trial, e, { target: index, targetEl: e.currentTarget as Element })
    faceUp.value = new Set([...faceUp.value, index])
    return
  }
  props.recorder.pointerDown(trial!, e, { target: index, targetEl: e.currentTarget as Element })
  faceUp.value = new Set([...faceUp.value, index])
  const a = props.instance.cards[first]!
  const b = props.instance.cards[index]!
  const isMatch = a.stimulus.id === b.stimulus.id
  props.recorder.endTrial(trial!, { correct: isMatch })
  const pair = [first, index]
  first = null
  trial = null
  try {
    if (isMatch) {
      matched.value = new Set([...matched.value, ...pair])
      if (matched.value.size === total) {
        busy.value = true
        await clock.wait(600)
        emit('done')
      }
    } else {
      busy.value = true
      wrong.value = new Set(pair)
      await clock.wait(props.config.flipBackMs)
      wrong.value = new Set()
      faceUp.value = new Set([...faceUp.value].filter((i) => !pair.includes(i)))
      busy.value = false
    }
  } catch (err) {
    ignoreCancel(err)
  }
}

function up(e: PointerEvent) {
  props.recorder.pointerUp(e)
}
</script>

<template>
  <div class="flex items-center justify-center p-4 pt-20 sm:p-8 sm:pt-20" @pointerup="up">
    <div
      class="grid w-full max-w-[min(92vw,calc(70vh*1.2))] gap-3 sm:gap-4"
      :style="{ gridTemplateColumns: cols }"
    >
      <button
        v-for="card in instance.cards"
        :key="card.index"
        class="relative aspect-square rounded-2xl border-4 transition-all duration-300"
        :class="[
          matched.has(card.index)
            ? 'border-[var(--good)] bg-[var(--tile)] opacity-70'
            : faceUp.has(card.index)
              ? wrong.has(card.index)
                ? 'border-[var(--bad)] bg-[var(--tile)]'
                : 'border-[var(--focus)] bg-[var(--tile)]'
              : 'border-[var(--tile-border)] bg-[var(--focus)]/80 hover:brightness-110',
        ]"
        :aria-label="faceUp.has(card.index) || matched.has(card.index) ? card.stimulus.word : '?'"
        data-testid="pair-card"
        :data-stimulus="card.stimulus.id"
        @pointerdown="flip(card.index, $event)"
      >
        <span
          v-if="faceUp.has(card.index) || matched.has(card.index)"
          class="flex h-full flex-col items-center justify-center gap-1"
        >
          <span class="text-[min(9vw,9vh,4.5rem)] leading-none">{{ card.stimulus.emoji }}</span>
          <span v-if="config.showWords" class="text-[0.75em]">{{ card.stimulus.word }}</span>
        </span>
        <span v-else class="text-[min(6vw,6vh,3rem)] text-white/90" aria-hidden="true">{{
          kids ? '⭐' : '?'
        }}</span>
      </button>
    </div>
  </div>
</template>
