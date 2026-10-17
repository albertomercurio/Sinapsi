<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsList, type TabsListProps } from 'reka-ui'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()
const delegated = reactiveOmit(props, 'class')
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    v-bind="delegated"
    :class="
      cn(
        'bg-muted text-muted-foreground inline-flex h-10 w-fit max-w-full items-center justify-center overflow-x-auto rounded-lg p-1',
        props.class,
      )
    "
  >
    <slot />
  </TabsList>
</template>
