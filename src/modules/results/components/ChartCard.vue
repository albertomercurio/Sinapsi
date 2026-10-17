<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChartLine, Table2 } from '@lucide/vue'

defineProps<{ title: string; subtitle?: string }>()
const { t } = useI18n()
const view = ref<'chart' | 'table'>('chart')
</script>

<template>
  <section class="bg-card rounded-xl border p-4 shadow-xs break-inside-avoid">
    <header class="mb-2 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold">{{ title }}</h3>
        <p v-if="subtitle" class="text-muted-foreground mt-0.5 text-xs">{{ subtitle }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <slot name="badge" />
        <div
          class="bg-muted no-print inline-flex rounded-md p-0.5"
          role="group"
          :aria-label="t('results.view')"
        >
          <button
            class="rounded px-1.5 py-1"
            :class="view === 'chart' ? 'bg-background shadow-xs' : 'text-muted-foreground'"
            :aria-pressed="view === 'chart'"
            :title="t('results.chartView')"
            @click="view = 'chart'"
          >
            <ChartLine class="size-3.5" />
          </button>
          <button
            class="rounded px-1.5 py-1"
            :class="view === 'table' ? 'bg-background shadow-xs' : 'text-muted-foreground'"
            :aria-pressed="view === 'table'"
            :title="t('results.tableView')"
            @click="view = 'table'"
          >
            <Table2 class="size-3.5" />
          </button>
        </div>
      </div>
    </header>
    <div v-show="view === 'chart'"><slot /></div>
    <div v-if="view === 'table'" class="max-h-72 overflow-auto text-sm"><slot name="table" /></div>
    <slot name="footer" />
  </section>
</template>
