<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const model = defineModel<string>({ default: '' })
const { t } = useI18n()

function onInput(e: Event) {
  model.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
}
</script>

<template>
  <div class="grid gap-2">
    <Label for="totp">{{ t('auth.totpCode') }}</Label>
    <Input
      id="totp"
      :model-value="model"
      class="h-12 text-center font-mono text-2xl tracking-[0.5em]"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="6"
      pattern="[0-9]{6}"
      placeholder="000000"
      required
      data-testid="totp-input"
      @input="onInput"
    />
  </div>
</template>
