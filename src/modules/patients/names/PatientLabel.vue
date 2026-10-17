<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useNamesStore } from './store'

/** Patient name (when the names key is unlocked on this device) with the code alongside. */
const props = defineProps<{
  patient: { id: string; org_id: string; code: string; name_enc: string | null } | null | undefined
  size?: 'sm' | 'lg'
  stacked?: boolean
}>()
const names = useNamesStore()

watchEffect(() => {
  if (props.patient && names.status === 'unlocked') void names.decryptAll([props.patient])
})
const name = computed(() => names.label(props.patient))
</script>

<template>
  <span
    v-if="patient"
    class="inline-flex min-w-0"
    :class="stacked ? 'flex-col' : 'items-baseline gap-2'"
    data-testid="patient-label"
  >
    <span
      v-if="name"
      class="truncate font-semibold"
      :class="size === 'lg' ? 'text-3xl tracking-tight' : ''"
      data-testid="patient-name"
      >{{ name }}</span
    >
    <span
      class="font-mono"
      :class="[
        name ? 'text-muted-foreground text-xs font-medium' : 'font-semibold',
        !name && size === 'lg' ? 'text-3xl font-bold tracking-tight' : '',
      ]"
      >{{ patient.code }}</span
    >
  </span>
</template>
