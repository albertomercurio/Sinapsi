<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { KeyRound, Lock, LockOpen, Loader2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { errorKey } from '@/shared/api/errors'
import { useNamesStore } from './store'
import UnlockNamesDialog from './UnlockNamesDialog.vue'

/** Practice settings: turn on encrypted names, change the passphrase, unlock/forget on this device. */
const { t } = useI18n()
const names = useNamesStore()
const pass = ref('')
const pass2 = ref('')
const busy = ref(false)
const unlockOpen = ref(false)
const resetOpen = ref(false)
const changing = ref(false)
const valid = computed(() => pass.value.length >= 12 && pass.value === pass2.value)

async function save() {
  busy.value = true
  try {
    if (names.status === 'disabled') {
      await names.enable(pass.value)
      toast.success(t('patients.names.enabled'))
    } else {
      await names.changePassphrase(pass.value)
      toast.success(t('patients.names.changed'))
    }
    pass.value = ''
    pass2.value = ''
    changing.value = false
  } catch (e) {
    toast.error(t(errorKey(e)))
  } finally {
    busy.value = false
  }
}

async function reset() {
  try {
    await names.reset()
    resetOpen.value = false
    toast.success(t('patients.names.resetDone'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2"
        ><KeyRound class="size-5" /> {{ t('patients.names.cardTitle') }}</CardTitle
      >
      <CardDescription>{{ t('patients.names.cardHelp') }}</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <p class="flex items-center gap-2 text-sm font-medium">
        <template v-if="names.status === 'disabled'">{{
          t('patients.names.statusDisabled')
        }}</template>
        <template v-else-if="names.status === 'locked'"
          ><Lock class="size-4" /> {{ t('patients.names.statusLocked') }}</template
        >
        <template v-else
          ><LockOpen class="size-4" /> {{ t('patients.names.statusUnlocked') }}</template
        >
      </p>

      <div class="flex flex-wrap gap-2">
        <Button v-if="names.status === 'locked'" @click="unlockOpen = true">{{
          t('patients.names.unlock')
        }}</Button>
        <Button v-if="names.status === 'unlocked'" variant="outline" @click="names.lock()">{{
          t('patients.names.forget')
        }}</Button>
        <Button
          v-if="names.status === 'unlocked' && names.isOwner && !changing"
          variant="outline"
          @click="changing = true"
        >
          {{ t('patients.names.change') }}
        </Button>
        <Button
          v-if="names.status !== 'disabled' && names.isOwner"
          variant="ghost"
          class="text-destructive"
          @click="resetOpen = true"
        >
          {{ t('patients.names.reset') }}
        </Button>
      </div>

      <form
        v-if="names.isOwner && (names.status === 'disabled' || changing)"
        class="grid gap-3"
        @submit.prevent="save"
      >
        <Alert variant="warning"
          ><AlertDescription>{{ t('patients.names.passphraseWarning') }}</AlertDescription></Alert
        >
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="grid gap-2">
            <Label for="np1">{{ t('patients.names.newPassphrase') }}</Label>
            <Input
              id="np1"
              v-model="pass"
              type="password"
              autocomplete="new-password"
              data-testid="names-new-pass"
            />
          </div>
          <div class="grid gap-2">
            <Label for="np2">{{ t('patients.names.repeatPassphrase') }}</Label>
            <Input
              id="np2"
              v-model="pass2"
              type="password"
              autocomplete="new-password"
              data-testid="names-new-pass2"
            />
          </div>
        </div>
        <p class="text-muted-foreground text-xs">{{ t('patients.names.passphraseRule') }}</p>
        <Button type="submit" class="w-fit" :disabled="!valid || busy" data-testid="names-enable">
          <Loader2 v-if="busy" class="animate-spin" />
          {{
            names.status === 'disabled' ? t('patients.names.enable') : t('patients.names.change')
          }}
        </Button>
      </form>
      <p v-if="!names.isOwner && names.status === 'disabled'" class="text-muted-foreground text-sm">
        {{ t('patients.names.ownerOnly') }}
      </p>
    </CardContent>
    <UnlockNamesDialog v-model:open="unlockOpen" />
    <ConfirmDialog
      v-model:open="resetOpen"
      :title="t('patients.names.resetTitle')"
      :description="t('patients.names.resetText')"
      :type-to-confirm="t('patients.names.resetConfirmWord')"
      destructive
      @confirm="reset"
    />
  </Card>
</template>
