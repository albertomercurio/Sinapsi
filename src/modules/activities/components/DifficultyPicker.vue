<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Slider } from '@/shared/ui/slider'
import InfoTip from '@/shared/components/InfoTip.vue'

/** null = adaptive; otherwise a fixed difficulty on the 1–5 scale. */
const model = defineModel<number | null>({ default: null })
// Absent boolean props are cast to false by Vue, so the default must be explicit.
const props = withDefaults(defineProps<{ allowAdaptive?: boolean }>(), { allowAdaptive: true })
const { t } = useI18n()

const value = computed({
  get: () => [model.value ?? 2],
  set: (v: number[]) => (model.value = v[0] ?? 2),
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div v-if="props.allowAdaptive" class="bg-muted inline-flex rounded-lg p-0.5 text-sm">
      <button
        type="button"
        class="rounded-md px-2.5 py-1"
        :class="model === null ? 'bg-background shadow-xs font-medium' : 'text-muted-foreground'"
        @click="model = null"
      >
        {{ t('common.adaptive') }}
      </button>
      <button
        type="button"
        class="rounded-md px-2.5 py-1"
        :class="model !== null ? 'bg-background shadow-xs font-medium' : 'text-muted-foreground'"
        @click="model = model ?? 2"
      >
        {{ t('activities.fixed') }}
      </button>
    </div>
    <div
      v-if="model !== null || !props.allowAdaptive"
      class="flex min-w-48 flex-1 items-center gap-3"
    >
      <Slider
        v-model="value"
        :min="1"
        :max="5"
        :step="0.5"
        class="flex-1"
        :thumb-label="t('common.difficulty')"
      />
      <span class="w-16 text-sm tabular-nums">{{
        t('common.level', { n: (model ?? 2).toFixed(1).replace('.0', '') })
      }}</span>
    </div>
    <InfoTip
      :text="`${t('help.difficulty')} ${t('help.levels')}`"
      :label="t('common.difficulty')"
      guide="ability"
    />
  </div>
</template>
