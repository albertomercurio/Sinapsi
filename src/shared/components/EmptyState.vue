<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon?: Component; title: string; description?: string }>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center"
  >
    <component
      :is="icon"
      v-if="icon"
      class="text-muted-foreground mb-3 size-10"
      aria-hidden="true"
    />
    <h3 class="font-medium">{{ title }}</h3>
    <p v-if="description" class="text-muted-foreground mt-1 max-w-md text-sm">{{ description }}</p>
    <div class="mt-4"><slot /></div>
  </div>
</template>
