<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Lock, ShieldCheck } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { PatientName } from './crypto'
import { useNamesStore } from './store'
import UnlockNamesDialog from './UnlockNamesDialog.vue'

/** First/last name inputs; the values are encrypted in the browser before saving. */
const model = defineModel<PatientName>({ required: true })
const { t } = useI18n()
const names = useNamesStore()
const unlockOpen = ref(false)
</script>

<template>
  <fieldset class="grid gap-3">
    <legend class="mb-2 text-sm font-semibold">{{ t('patients.names.legend') }}</legend>
    <template v-if="names.status === 'unlocked'">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="grid gap-2">
          <Label for="first-name">{{ t('patients.names.first') }}</Label>
          <Input
            id="first-name"
            v-model="model.first"
            maxlength="80"
            autocomplete="off"
            data-testid="first-name"
          />
        </div>
        <div class="grid gap-2">
          <Label for="last-name">{{ t('patients.names.last') }}</Label>
          <Input
            id="last-name"
            v-model="model.last"
            maxlength="80"
            autocomplete="off"
            data-testid="last-name"
          />
        </div>
      </div>
      <p class="text-muted-foreground flex items-center gap-1.5 text-xs">
        <ShieldCheck class="size-3.5 shrink-0" /> {{ t('patients.names.e2eNotice') }}
      </p>
    </template>
    <div v-else-if="names.status === 'locked'" class="flex flex-wrap items-center gap-3 text-sm">
      <Lock class="text-muted-foreground size-4" /> {{ t('patients.names.formLocked') }}
      <Button size="sm" variant="outline" @click="unlockOpen = true">{{
        t('patients.names.unlock')
      }}</Button>
    </div>
    <p v-else class="text-muted-foreground text-sm">
      {{ names.isOwner ? t('patients.names.formDisabledOwner') : t('patients.names.formDisabled') }}
    </p>
    <UnlockNamesDialog v-model:open="unlockOpen" />
  </fieldset>
</template>
