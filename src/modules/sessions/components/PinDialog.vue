<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { setPin, verifyPin } from '../runner/pin'

const props = defineProps<{ mode: 'set' | 'verify' }>()
const emit = defineEmits<{ ok: [] }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const pin = ref('')
const pin2 = ref('')
const error = ref<string | null>(null)

watch(open, (v) => {
  if (v) {
    pin.value = ''
    pin2.value = ''
    error.value = null
  }
})

async function submit() {
  error.value = null
  if (props.mode === 'set') {
    if (!/^\d{4,8}$/.test(pin.value)) return (error.value = t('sessions.pin.invalid'))
    if (pin.value !== pin2.value) return (error.value = t('sessions.pin.mismatch'))
    await setPin(pin.value)
    open.value = false
    emit('ok')
  } else if (await verifyPin(pin.value)) {
    open.value = false
    emit('ok')
  } else {
    error.value = t('sessions.pin.wrong')
    pin.value = ''
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{{
          mode === 'set' ? t('sessions.pin.setTitle') : t('sessions.pin.verifyTitle')
        }}</DialogTitle>
        <DialogDescription>{{
          mode === 'set' ? t('sessions.pin.setHelp') : t('sessions.pin.verifyHelp')
        }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-3" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="pin">PIN</Label>
          <Input
            id="pin"
            v-model="pin"
            type="password"
            inputmode="numeric"
            autocomplete="off"
            maxlength="8"
            class="text-center font-mono text-xl tracking-widest"
            data-testid="pin-input"
          />
        </div>
        <div v-if="mode === 'set'" class="grid gap-2">
          <Label for="pin2">{{ t('sessions.pin.repeat') }}</Label>
          <Input
            id="pin2"
            v-model="pin2"
            type="password"
            inputmode="numeric"
            autocomplete="off"
            maxlength="8"
            class="text-center font-mono text-xl tracking-widest"
            data-testid="pin-input-2"
          />
        </div>
        <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
        <DialogFooter>
          <Button type="submit" data-testid="pin-submit">{{ t('common.confirm') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
