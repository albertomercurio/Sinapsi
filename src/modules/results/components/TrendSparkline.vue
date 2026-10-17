<script setup lang="ts">
import { computed } from 'vue'

/** Tiny single-series trend line (2px) with an end dot; decorative twin of a labelled value. */
const props = defineProps<{ values: number[]; width?: number; height?: number }>()
const w = computed(() => props.width ?? 96)
const h = computed(() => props.height ?? 28)
const pts = computed(() => {
  const v = props.values
  if (v.length < 2) return []
  const min = Math.min(...v)
  const max = Math.max(...v)
  const span = max - min || 1
  return v.map((y, i) => [
    3 + (i * (w.value - 6)) / (v.length - 1),
    h.value - 3 - ((y - min) / span) * (h.value - 6),
  ])
})
</script>

<template>
  <svg
    v-if="pts.length"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
    aria-hidden="true"
    class="text-[#2a78d6] dark:text-[#3987e5]"
  >
    <polyline
      :points="pts.map((p) => p.join(',')).join(' ')"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      :cx="pts.at(-1)![0]"
      :cy="pts.at(-1)![1]"
      r="3.5"
      fill="currentColor"
      class="stroke-card"
      stroke-width="2"
    />
  </svg>
</template>
