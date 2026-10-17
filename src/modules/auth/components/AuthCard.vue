<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="bg-card w-full max-w-md rounded-2xl border p-8 shadow-sm">
    <h1 class="text-xl font-semibold tracking-tight">{{ title }}</h1>
    <p v-if="description" class="text-muted-foreground mt-1.5 text-sm">{{ description }}</p>
    <div class="mt-6">
      <slot />
    </div>
  </div>
</template>
