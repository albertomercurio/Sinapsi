<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef } from 'vue'
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

const partIndex = ref(0)
const next = ref(1)
const errorNode = ref<number | null>(null)
const between = ref(false)
let trial: TrialRecord | null = null
const svgEl = ref<SVGSVGElement | null>(null)

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

const part = computed(() => props.instance.parts[partIndex.value]!)
const r = computed(() => props.instance.radius)
const path = computed(() =>
  part.value.nodes
    .slice(0, next.value)
    .map((n) => `${n.x},${n.y}`)
    .join(' '),
)

async function startPart() {
  between.value = false
  next.value = 1
  await nextTick()
  trial = props.recorder.beginTrial({ part: part.value.id }, { svgRect: svgRect() })
  await props.recorder.markOnset(trial)
}

onMounted(() => void startPart())

async function tap(i: number, e: PointerEvent) {
  if (!trial || props.paused || between.value) return
  props.recorder.pointerDown(trial, e, { target: i, targetEl: e.currentTarget as Element })
  if (i === next.value) {
    next.value++
    if (next.value >= part.value.nodes.length) {
      props.recorder.endTrial(trial, { correct: true, extra: { complete: true } })
      trial = null
      try {
        await clock.wait(500)
        if (partIndex.value < props.instance.parts.length - 1) {
          partIndex.value++
          between.value = true
        } else {
          emit('done')
        }
      } catch (err) {
        ignoreCancel(err)
      }
    }
  } else if (i !== next.value - 1) {
    errorNode.value = i
    setTimeout(() => (errorNode.value === i ? (errorNode.value = null) : null), 600)
  }
}

function stop() {
  if (trial) props.recorder.endTrial(trial, { correct: false, extra: { complete: false } })
  trial = null
  emit('done')
}
</script>

<template>
  <div
    class="flex flex-col gap-3 p-3 pt-20 sm:p-6 sm:pt-20"
    @pointerup="recorder.pointerUp($event)"
  >
    <div v-if="between" class="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p class="max-w-xl text-[1.3em]">{{ t('activity.trail-connect.partB') }}</p>
      <button
        class="h-20 min-w-64 rounded-2xl bg-[var(--good)] px-10 text-[1.4em] font-bold text-white"
        data-testid="trail-start-b"
        @click="startPart"
      >
        {{ t('activities.runtime.start') }}
      </button>
    </div>
    <template v-else>
      <p class="text-center text-[1.1em]">
        {{
          part.id === 'A' ? t('activity.trail-connect.hintA') : t('activity.trail-connect.hintB')
        }}
      </p>
      <div class="mx-auto w-full max-w-[calc((100dvh-14rem)*1.5625)]">
        <svg
          ref="svgEl"
          :viewBox="`0 0 ${STAGE.width} ${STAGE.height}`"
          class="h-auto w-full touch-manipulation rounded-2xl border-4 border-[var(--tile-border)] bg-[var(--tile)]"
        >
          <polyline
            :points="path"
            fill="none"
            stroke="var(--focus)"
            stroke-width="6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <g
            v-for="(node, i) in part.nodes"
            :key="node.label"
            class="cursor-pointer"
            data-testid="trail-node"
            :data-label="node.label"
            :data-index="i"
            @pointerdown="tap(i, $event)"
          >
            <circle
              :cx="node.x"
              :cy="node.y"
              :r="r"
              :fill="
                i < next ? 'var(--tile-active)' : errorNode === i ? 'var(--bad)' : 'var(--tile)'
              "
              :stroke="i === 0 ? 'var(--good)' : 'var(--tile-border)'"
              :stroke-width="i === 0 || i === part.nodes.length - 1 ? 7 : 4"
            />
            <text
              :x="node.x"
              :y="node.y"
              text-anchor="middle"
              dominant-baseline="central"
              :font-size="r * 0.95"
              font-weight="700"
              class="fill-current"
            >
              {{ node.label }}
            </text>
          </g>
        </svg>
      </div>
      <div class="flex justify-center">
        <button
          class="h-12 rounded-xl border-2 border-[var(--tile-border)] px-5 opacity-70"
          @click="stop"
        >
          {{ t('activity.trail-connect.giveUp') }}
        </button>
      </div>
    </template>
  </div>
</template>
