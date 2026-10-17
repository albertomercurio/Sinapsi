<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Factor } from '@supabase/supabase-js'
import { KeyRound, Plus, Smartphone, Trash2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { supabase } from '@/shared/api/supabase'
import { errorKey } from '@/shared/api/errors'
import PasswordRules from '@/modules/auth/components/PasswordRules.vue'
import { passwordOk } from '@/modules/auth/password'
import PinDialog from '@/modules/sessions/components/PinDialog.vue'

const { t, d } = useI18n()
const router = useRouter()
const factors = ref<Factor[]>([])
const removeTarget = ref<Factor | null>(null)
const removeOpen = ref(false)
const password = ref('')
const confirm = ref('')
const pinOpen = ref(false)

async function load() {
  const { data } = await supabase.auth.mfa.listFactors()
  factors.value = (data?.totp ?? []).filter((f) => f.status === 'verified')
}
onMounted(load)

const canRemove = computed(() => factors.value.length > 1)

async function remove() {
  if (!removeTarget.value) return
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: removeTarget.value.id })
    if (error) throw error
    removeOpen.value = false
    await load()
    toast.success(t('settings.factorRemoved'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}

async function changePassword() {
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value })
    if (error) throw error
    password.value = ''
    confirm.value = ''
    toast.success(t('auth.passwordSaved'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div class="grid max-w-2xl gap-4">
    <Card>
      <CardHeader>
        <CardTitle>{{ t('settings.twoFactorTitle') }}</CardTitle>
        <CardDescription>{{ t('settings.twoFactorHelp') }}</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3">
        <ul class="grid gap-2">
          <li
            v-for="f in factors"
            :key="f.id"
            class="flex items-center gap-3 rounded-lg border p-3 text-sm"
          >
            <Smartphone class="text-muted-foreground size-5" />
            <div class="flex-1">
              <p class="font-medium">{{ f.friendly_name || t('auth.authenticator') }}</p>
              <p class="text-muted-foreground text-xs">
                {{ t('settings.addedOn', { date: d(new Date(f.created_at), 'medium') }) }}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              :disabled="!canRemove"
              :aria-label="t('common.remove')"
              @click="((removeTarget = f), (removeOpen = true))"
              ><Trash2
            /></Button>
          </li>
        </ul>
        <Alert v-if="factors.length < 2" variant="warning"
          ><AlertDescription>{{ t('settings.backupFactorAdvice') }}</AlertDescription></Alert
        >
        <Button
          variant="outline"
          class="w-fit"
          @click="router.push({ name: 'mfa-enroll', query: { extra: '1' } })"
          ><Plus /> {{ t('settings.addFactor') }}</Button
        >
      </CardContent>
    </Card>
    <Card>
      <CardHeader
        ><CardTitle>{{ t('settings.passwordTitle') }}</CardTitle></CardHeader
      >
      <CardContent>
        <form class="grid gap-3" @submit.prevent="changePassword">
          <div class="grid gap-2">
            <Label for="np">{{ t('auth.newPassword') }}</Label
            ><Input id="np" v-model="password" type="password" autocomplete="new-password" />
          </div>
          <div class="grid gap-2">
            <Label for="np2">{{ t('auth.confirmPassword') }}</Label
            ><Input id="np2" v-model="confirm" type="password" autocomplete="new-password" />
          </div>
          <PasswordRules :password="password" />
          <Button
            type="submit"
            class="w-fit"
            :disabled="!passwordOk(password) || password !== confirm"
            ><KeyRound /> {{ t('auth.savePassword') }}</Button
          >
        </form>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{{ t('settings.pinTitle') }}</CardTitle>
        <CardDescription>{{ t('settings.pinHelp') }}</CardDescription>
      </CardHeader>
      <CardContent
        ><Button variant="outline" @click="pinOpen = true">{{
          t('settings.changePin')
        }}</Button></CardContent
      >
    </Card>
    <ConfirmDialog
      v-model:open="removeOpen"
      :title="t('settings.removeFactorTitle')"
      destructive
      @confirm="remove"
    />
    <PinDialog v-model:open="pinOpen" mode="set" @ok="toast.success(t('common.saved'))" />
  </div>
</template>
