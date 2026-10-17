<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pause, Play, RotateCcw } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { createRng } from '@/shared/lib/rng'
import type { ActivityRun } from '@/shared/api/types'
import type { RunRecording } from '@/modules/measurement'
import { loadContentPack } from '@/content'
import { getActivity } from '@/modules/activities/registry'
import { ageGroupFor } from '@/modules/activities/taxonomy'
import type { Instance as CancelInstance } from '@/activities/cancellation/logic'
import type { Instance as TrailInstance } from '@/activities/trail-connect/logic'
import { useChartTokens } from '../charts/theme'

/**
 * Replays the search path of spatial activities (cancellation, connect-in-order)
 * from the stored seed + raw events: the exercise is regenerated exactly.
 */
const props = defineProps<{ run: ActivityRun; recording: RunRecording; birthYear: number | null }>()
const { t } = useI18n()
const tk = useChartTokens()
const instance = shallowRef<unknown>(null)
const time = ref(0)
const playing = ref(false)
const speed = ref(4)
let raf = 0
let last = 0

const VIEW = { width: 1000, height: 640 }
const kind = computed(() =>
  props.run.activity_id === 'cancellation'
    ? 'cancel'
    : props.run.activity_id === 'trail-connect'
      ? 'trail'
      : null,
)

watchEffect(async () => {
  const act = getActivity(props.run.activity_id)
  if (!act || !kind.value) return
  const content = await loadContentPack('it')
  instance.value = act.generate({
    rng: createRng(Number(props.run.seed)),
    config: props.run.config as never,
    difficulty: Number(props.run.difficulty),
    ageGroup: ageGroupFor(props.birthYear),
    locale: 'it',
    content,
  })
})

const endTime = computed(() => {
  const all = props.recording.trials.flatMap((tr) => tr.responses.map((r) => r.t))
  return Math.max(...all, props.recording.durationMs)
})

type Rect = { x: number; y: number; width: number; height: number }

/** Pointer trace of one trial, mapped from stage px to the activity's logical viewBox. */
function traceFor(trialIndex: number): string {
  const tr = props.recording.trials[trialIndex]
  const rect = (tr?.extra as { svgRect?: Rect | null } | undefined)?.svgRect
  if (!tr || !rect || !rect.width) return ''
  const from = tr.onset ?? 0
  const to = props.recording.trials[trialIndex + 1]?.onset ?? Infinity
  const sx = VIEW.width / rect.width
  const sy = VIEW.height / rect.height
  return props.recording.samples
    .filter((s) => s.t >= from && s.t < to && s.t <= time.value)
    .map((s) => `${Math.round((s.x - rect.x) * sx)},${Math.round((s.y - rect.y) * sy)}`)
    .join(' ')
}
const trace = computed(() => traceFor(0))

const cancel = computed(() => {
  if (kind.value !== 'cancel' || !instance.value) return null
  const inst = instance.value as CancelInstance
  const marked = new Map<number, boolean>()
  const order: number[] = []
  for (const r of props.recording.trials[0]?.responses ?? []) {
    if (r.t > time.value) break
    const i = Number(r.target)
    if (marked.has(i)) {
      marked.delete(i)
      order.splice(order.lastIndexOf(i), 1)
    } else {
      marked.set(i, true)
      order.push(i)
    }
  }
  return {
    inst,
    marked,
    path: order.map((i) => `${inst.items[i]!.x},${inst.items[i]!.y}`).join(' '),
  }
})

const trail = computed(() => {
  if (kind.value !== 'trail' || !instance.value) return null
  const inst = instance.value as TrailInstance
  return inst.parts.map((part, pi) => {
    const tr = props.recording.trials[pi]
    let next = 1
    const errors: number[] = []
    for (const r of tr?.responses ?? []) {
      if (r.t > time.value) break
      const target = Number(r.target)
      if (target === next) next++
      else if (target !== next - 1) errors.push(target)
    }
    return { part, next, errors, active: !!tr && (tr.onset ?? Infinity) <= time.value }
  })
})

function tick(ts: number) {
  if (!playing.value) return
  time.value = Math.min(endTime.value, time.value + (ts - last) * speed.value)
  last = ts
  if (time.value >= endTime.value) playing.value = false
  else raf = requestAnimationFrame(tick)
}

function toggle() {
  playing.value = !playing.value
  if (playing.value) {
    if (time.value >= endTime.value) time.value = 0
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

function restart() {
  time.value = 0
}

onBeforeUnmount(() => cancelAnimationFrame(raf))
time.value = 1e12 // show the final state first
</script>

<template>
  <div v-if="kind && instance" class="grid gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" @click="toggle"
        ><component :is="playing ? Pause : Play" />
        {{ playing ? t('results.replayPause') : t('results.replayPlay') }}</Button
      >
      <Button size="sm" variant="ghost" @click="restart"
        ><RotateCcw /> {{ t('results.replayRestart') }}</Button
      >
      <select
        v-model.number="speed"
        class="bg-card rounded-md border px-2 py-1 text-sm"
        :aria-label="t('results.replaySpeed')"
      >
        <option :value="1">1×</option>
        <option :value="4">4×</option>
        <option :value="10">10×</option>
      </select>
      <span class="text-muted-foreground text-xs tabular-nums"
        >{{ Math.round(Math.min(time, endTime) / 100) / 10 }} s /
        {{ Math.round(endTime / 100) / 10 }} s</span
      >
    </div>

    <svg
      v-if="cancel"
      :viewBox="`0 0 ${VIEW.width} ${VIEW.height}`"
      class="w-full rounded-lg border"
      :style="{ background: tk.surface }"
    >
      <polyline v-if="trace" :points="trace" fill="none" :stroke="tk.grid" stroke-width="2" />
      <polyline
        :points="cancel.path"
        fill="none"
        :stroke="tk.series[0]"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <g v-for="(it, i) in cancel.inst.items" :key="i">
        <text
          :x="it.x"
          :y="it.y"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="cancel.inst.radius * 1.2"
          :fill="it.target ? tk.textPrimary : tk.muted"
          font-weight="700"
        >
          {{ it.glyph }}
        </text>
        <circle
          v-if="cancel.marked.has(i)"
          :cx="it.x"
          :cy="it.y"
          :r="cancel.inst.radius * 0.95"
          fill="none"
          :stroke="it.target ? tk.series[0] : tk.series[1]"
          stroke-width="5"
        />
        <circle
          v-else-if="it.target && time >= endTime"
          :cx="it.x"
          :cy="it.y"
          :r="cancel.inst.radius * 0.95"
          fill="none"
          :stroke="tk.muted"
          stroke-width="2"
          stroke-dasharray="6 6"
        />
      </g>
    </svg>

    <div v-if="trail" class="grid gap-3 lg:grid-cols-2">
      <svg
        v-for="p in trail"
        :key="p.part.id"
        :viewBox="`0 0 ${VIEW.width} ${VIEW.height}`"
        class="w-full rounded-lg border"
        :style="{ background: tk.surface }"
      >
        <polyline
          v-if="p.active"
          :points="traceFor(trail.indexOf(p))"
          fill="none"
          :stroke="tk.grid"
          stroke-width="2"
        />
        <polyline
          :points="
            p.part.nodes
              .slice(0, p.next)
              .map((nd) => `${nd.x},${nd.y}`)
              .join(' ')
          "
          fill="none"
          :stroke="tk.series[0]"
          stroke-width="4"
          stroke-linejoin="round"
        />
        <g v-for="(nd, i) in p.part.nodes" :key="nd.label">
          <circle
            :cx="nd.x"
            :cy="nd.y"
            :r="(instance as TrailInstance).radius"
            :fill="tk.surface"
            :stroke="p.errors.includes(i) ? tk.series[1] : i < p.next ? tk.series[0] : tk.axis"
            :stroke-width="p.errors.includes(i) ? 6 : 3"
          />
          <text
            :x="nd.x"
            :y="nd.y"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="(instance as TrailInstance).radius * 0.9"
            :fill="tk.textPrimary"
            font-weight="700"
          >
            {{ nd.label }}
          </text>
        </g>
        <text x="16" y="34" :fill="tk.muted" font-size="26">{{ p.part.id }}</text>
      </svg>
    </div>
    <p class="text-muted-foreground text-xs">
      {{ kind === 'cancel' ? t('results.replayCancelLegend') : t('results.replayTrailLegend') }}
    </p>
  </div>
</template>
