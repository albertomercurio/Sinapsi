<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from '@lucide/vue'
import { toast, useToasts } from './toast'

const items = useToasts()
const icon = { success: CircleCheck, error: CircleAlert, info: Info }
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in items"
        :key="t.id"
        class="bg-card pointer-events-auto flex items-start gap-3 rounded-lg border p-3 text-sm shadow-lg"
        :class="{
          'border-destructive/50': t.kind === 'error',
          'border-success/50': t.kind === 'success',
        }"
        :role="t.kind === 'error' ? 'alert' : 'status'"
      >
        <component
          :is="icon[t.kind]"
          class="mt-0.5 size-4 shrink-0"
          :class="{
            'text-destructive': t.kind === 'error',
            'text-success-strong': t.kind === 'success',
          }"
        />
        <p class="flex-1">{{ t.message }}</p>
        <button class="opacity-60 hover:opacity-100" @click="toast.dismiss(t.id)">
          <X class="size-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
