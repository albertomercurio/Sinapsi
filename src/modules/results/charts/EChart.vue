<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import { init, type EChartsType } from './echarts'

const props = defineProps<{ option: EChartsCoreOption; height?: number; label: string }>()
const emit = defineEmits<{ pointClick: [data: unknown] }>()
const el = ref<HTMLDivElement | null>(null)
const chart = shallowRef<EChartsType | null>(null)
let ro: ResizeObserver | null = null

onMounted(() => {
  if (!el.value) return
  chart.value = init(el.value, undefined, {
    renderer: 'canvas',
    devicePixelRatio: Math.max(2, window.devicePixelRatio || 1),
  })
  chart.value.setOption(props.option, { notMerge: true })
  chart.value.on('click', (p) => emit('pointClick', (p as { data?: unknown }).data))
  ro = new ResizeObserver(() => chart.value?.resize())
  ro.observe(el.value)
})

watch(
  () => props.option,
  (o) => chart.value?.setOption(o, { notMerge: true }),
  { deep: false },
)

onBeforeUnmount(() => {
  ro?.disconnect()
  chart.value?.dispose()
})
</script>

<template>
  <div
    ref="el"
    class="w-full"
    :style="{ height: `${height ?? 260}px` }"
    role="img"
    :aria-label="label"
  />
</template>
