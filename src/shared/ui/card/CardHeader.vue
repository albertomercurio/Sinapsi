<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    data-slot="card-header"
    :class="
      cn(
        'grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5 has-[[data-slot=card-action]]:grid-cols-[1fr_auto]',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
