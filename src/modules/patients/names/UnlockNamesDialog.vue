<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, LockOpen } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useNamesStore } from './store'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const names = useNamesStore()
const passphrase = ref('')
const remember = ref(true)
const busy = ref(false)
const error = ref(false)

watch(open, (v) => {
  if (v) {
    passphrase.value = ''
    error.value = false
  }
})

async function submit() {
  busy.value = true
  error.value = false
  const ok = await names.unlock(passphrase.value, remember.value)
  busy.value = false
  if (ok) open.value = false
  else error.value = true
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('patients.names.unlockTitle') }}</DialogTitle>
        <DialogDescription>{{ t('patients.names.unlockHelp') }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="names-pass">{{ t('patients.names.passphrase') }}</Label>
          <Input
            id="names-pass"
            v-model="passphrase"
            type="password"
            autocomplete="off"
            data-testid="names-passphrase"
          />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <Checkbox v-model="remember" /> {{ t('patients.names.remember') }}
        </label>
        <p v-if="error" class="text-destructive text-sm" role="alert">
          {{ t('patients.names.wrongPassphrase') }}
        </p>
        <DialogFooter>
          <Button type="submit" :disabled="!passphrase || busy" data-testid="names-unlock-submit">
            <Loader2 v-if="busy" class="animate-spin" /><LockOpen v-else />
            {{ t('patients.names.unlock') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
