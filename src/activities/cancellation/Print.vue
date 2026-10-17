<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { STAGE, type Instance } from './logic'

const props = defineProps<{ instance: Instance; code?: string; dateLabel?: string }>()
const { t } = useI18n()
const emojiSet = computed(() => /\p{Extended_Pictographic}/u.test(props.instance.target))
</script>

<template>
  <section class="print-page mx-auto max-w-[190mm] bg-white p-4 text-black">
    <header class="mb-4 flex items-start justify-between gap-4 text-sm">
      <div>
        <h2 class="text-lg font-bold">{{ t('activity.cancellation.name') }}</h2>
        <p class="mt-1 max-w-[120mm]">{{ t('activity.cancellation.printInstructions') }}</p>
      </div>
      <div class="text-right">
        <p v-if="code">{{ code }}</p>
        <p v-if="dateLabel">{{ dateLabel }}</p>
        <p class="mt-2 flex items-center justify-end gap-2">
          {{ t('activity.cancellation.find') }}
          <span
            class="inline-flex size-10 items-center justify-center rounded border-2 border-black text-xl font-bold"
            >{{ instance.target }}</span
          >
        </p>
      </div>
    </header>
    <svg :viewBox="`0 0 ${STAGE.width} ${STAGE.height}`" class="w-full border-2 border-black">
      <text
        v-for="(item, i) in instance.items"
        :key="i"
        :x="item.x"
        :y="item.y"
        text-anchor="middle"
        dominant-baseline="central"
        :font-size="instance.radius * (emojiSet ? 1.25 : 1.4)"
        :transform="item.rotate ? `rotate(${item.rotate} ${item.x} ${item.y})` : undefined"
        font-weight="700"
      >
        {{ item.glyph }}
      </text>
    </svg>
    <footer class="mt-3 flex justify-between text-xs">
      <span>{{ t('activity.cancellation.printTime') }} ________</span>
      <span
        >{{ t('activity.cancellation.printFound') }} ____ /
        {{ instance.items.filter((i) => i.target).length }}</span
      >
    </footer>
  </section>
</template>
