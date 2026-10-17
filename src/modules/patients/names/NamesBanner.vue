<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { KeyRound, Lock } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { useNamesStore } from './store'
import UnlockNamesDialog from './UnlockNamesDialog.vue'

/** Explains why names are not visible and offers to unlock or enable them. */
const { t } = useI18n()
const router = useRouter()
const names = useNamesStore()
const unlockOpen = ref(false)
</script>

<template>
  <Alert v-if="names.status === 'locked'" variant="info" class="mb-4">
    <Lock />
    <AlertTitle>{{ t('patients.names.lockedTitle') }}</AlertTitle>
    <AlertDescription>
      <p>{{ t('patients.names.lockedText') }}</p>
      <Button size="sm" class="mt-2" data-testid="names-unlock" @click="unlockOpen = true">{{
        t('patients.names.unlock')
      }}</Button>
    </AlertDescription>
  </Alert>
  <Alert v-else-if="names.status === 'disabled' && names.isOwner" variant="info" class="mb-4">
    <KeyRound />
    <AlertTitle>{{ t('patients.names.disabledTitle') }}</AlertTitle>
    <AlertDescription>
      <p>{{ t('patients.names.disabledText') }}</p>
      <Button
        size="sm"
        variant="outline"
        class="mt-2"
        @click="router.push({ name: 'settings-organization' })"
        >{{ t('patients.names.enableCta') }}</Button
      >
    </AlertDescription>
  </Alert>
  <UnlockNamesDialog v-model:open="unlockOpen" />
</template>
