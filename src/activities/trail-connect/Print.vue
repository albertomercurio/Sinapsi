<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { STAGE, type Instance } from './logic'

defineProps<{ instance: Instance; code?: string; dateLabel?: string }>()
const { t } = useI18n()
</script>

<template>
  <section
    v-for="part in instance.parts"
    :key="part.id"
    class="print-page mx-auto max-w-[190mm] bg-white p-4 text-black"
  >
    <header class="mb-4 flex items-start justify-between gap-4 text-sm">
      <div>
        <h2 class="text-lg font-bold">{{ t('activity.trail-connect.name') }} — {{ part.id }}</h2>
        <p class="mt-1 max-w-[130mm]">
          {{
            part.id === 'A'
              ? t('activity.trail-connect.printA')
              : t('activity.trail-connect.printB')
          }}
        </p>
      </div>
      <div class="text-right">
        <p v-if="code">{{ code }}</p>
        <p v-if="dateLabel">{{ dateLabel }}</p>
      </div>
    </header>
    <svg :viewBox="`0 0 ${STAGE.width} ${STAGE.height}`" class="w-full border-2 border-black">
      <g v-for="(node, i) in part.nodes" :key="node.label">
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="instance.radius"
          fill="white"
          stroke="black"
          :stroke-width="i === 0 || i === part.nodes.length - 1 ? 6 : 3"
        />
        <text
          :x="node.x"
          :y="node.y"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="instance.radius * 0.95"
          font-weight="700"
        >
          {{ node.label }}
        </text>
      </g>
    </svg>
    <footer class="mt-3 flex justify-between text-xs">
      <span>{{ t('activity.trail-connect.printTime') }} ________</span>
      <span>{{ t('activity.trail-connect.printErrors') }} ________</span>
    </footer>
  </section>
</template>
