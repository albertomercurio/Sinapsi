<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { Toaster } from '@/shared/ui/toast'
import AuthLayout from './layouts/AuthLayout.vue'
import WorkspaceLayout from './layouts/WorkspaceLayout.vue'
import PlayerLayout from './layouts/PlayerLayout.vue'
import BareLayout from './layouts/BareLayout.vue'

const route = useRoute()
const layouts = {
  auth: AuthLayout,
  workspace: WorkspaceLayout,
  player: PlayerLayout,
  bare: BareLayout,
}
const layout = computed(() =>
  route.matched.length ? layouts[route.meta.layout ?? 'workspace'] : BareLayout,
)
</script>

<template>
  <TooltipProvider>
    <component :is="layout">
      <RouterView />
    </component>
    <Toaster />
  </TooltipProvider>
</template>
