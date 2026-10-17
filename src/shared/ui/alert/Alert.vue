<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        info: 'bg-accent/60 text-accent-foreground border-accent',
        warning: 'bg-warning/10 border-warning/40 text-foreground',
        destructive:
          'text-destructive bg-card border-destructive/40 [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)
type AlertVariants = VariantProps<typeof alertVariants>

const props = defineProps<{ variant?: AlertVariants['variant']; class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="alert" :class="cn(alertVariants({ variant }), props.class)" role="alert">
    <slot />
  </div>
</template>
