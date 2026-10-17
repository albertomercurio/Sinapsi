<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>

<template>
  <div class="flex items-center gap-2.5 select-none">
    <svg viewBox="0 0 32 32" class="size-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="9" class="fill-primary" />
      <circle cx="10" cy="11" r="3" class="fill-primary-foreground" />
      <circle cx="22" cy="21" r="3" class="fill-primary-foreground" />
      <circle cx="22" cy="10" r="2" class="fill-primary-foreground/70" />
      <path
        d="M10 11 C 16 11, 16 21, 22 21 M22 10 L 16.5 15.5"
        class="stroke-primary-foreground"
        stroke-width="1.8"
        fill="none"
        stroke-linecap="round"
      />
    </svg>
    <span v-if="!compact" class="text-lg font-semibold tracking-tight">Sinapsi</span>
  </div>
</template>
