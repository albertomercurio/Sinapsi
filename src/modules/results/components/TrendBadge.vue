<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from '@lucide/vue'
import type { TrendDirection } from '@/modules/scoring'

/** Descriptive trend versus the patient's own history; status colour + icon + label, never colour alone. */
const props = defineProps<{ direction: TrendDirection }>()
const { t } = useI18n()
const cfg = computed(
  () =>
    ({
      improving: { icon: ArrowUpRight, cls: 'bg-[#0ca30c]/12 text-[#006300] dark:text-[#0ca30c]' },
      declining: {
        icon: ArrowDownRight,
        cls: 'bg-[#d03b3b]/12 text-[#b42f2f] dark:text-[#e66767]',
      },
      stable: { icon: ArrowRight, cls: 'bg-muted text-muted-foreground' },
      insufficient: { icon: Minus, cls: 'bg-muted text-muted-foreground' },
    })[props.direction],
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
    :class="cfg.cls"
    data-testid="trend-badge"
    :data-direction="direction"
  >
    <component :is="cfg.icon" class="size-3.5" aria-hidden="true" />
    {{ t(`results.trend.${direction}`) }}
  </span>
</template>
