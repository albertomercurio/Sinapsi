<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib/utils'
import { badgeVariants, type BadgeVariants } from './variants'

const props = defineProps<{ variant?: BadgeVariants['variant']; class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span data-slot="badge" :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>
