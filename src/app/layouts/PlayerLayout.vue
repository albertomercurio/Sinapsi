<script setup lang="ts">
import { useAuthStore } from '@/modules/auth/store'
import { useIdleLogout } from '@/modules/auth/useIdleLogout'

const auth = useAuthStore()
useIdleLogout(() => auth.currentMembership?.idle_timeout_min ?? 15)
</script>

<template>
  <div class="min-h-dvh">
    <slot />
  </div>
</template>
