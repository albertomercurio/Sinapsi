<script setup lang="ts" generic="T extends string | number | null">
import type { HTMLAttributes } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { cn } from '@/shared/lib/utils'

export interface SelectOption<V> {
  value: V
  label: string
  disabled?: boolean
}

// Attributes such as id, aria-label and data-testid belong on the <select>, not the wrapper.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  options: SelectOption<T>[]
  class?: HTMLAttributes['class']
  placeholder?: string
}>()
const model = defineModel<T>()
</script>

<template>
  <div :class="cn('relative w-full', props.class)">
    <select
      v-bind="$attrs"
      v-model="model"
      data-slot="select"
      class="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full appearance-none rounded-md border bg-card py-1 pr-9 pl-3 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
    >
      <option v-if="placeholder" disabled :value="null">{{ placeholder }}</option>
      <option v-for="o in options" :key="String(o.value)" :value="o.value" :disabled="o.disabled">
        {{ o.label }}
      </option>
    </select>
    <ChevronDown
      class="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      aria-hidden="true"
    />
  </div>
</template>
