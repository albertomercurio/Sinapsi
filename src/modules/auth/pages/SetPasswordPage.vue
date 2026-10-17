<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { KeyRound } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { supabase } from '@/shared/api/supabase'
import { errorKey } from '@/shared/api/errors'
import { toast } from '@/shared/ui/toast'
import AuthCard from '../components/AuthCard.vue'
import PasswordRules from '../components/PasswordRules.vue'
import { passwordOk } from '../password'
import { useAuthStore } from '../store'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const password = ref('')
const confirm = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const valid = computed(() => passwordOk(password.value) && password.value === confirm.value)

onMounted(async () => {
  await auth.refreshAal()
  // Accounts that already have 2FA must pass it before changing the password.
  if (auth.needsMfaVerify) {
    await router.replace({ name: 'mfa-verify', query: { redirect: route.fullPath } })
  }
})

async function submit() {
  busy.value = true
  error.value = null
  try {
    const { error: e } = await supabase.auth.updateUser({ password: password.value })
    if (e) throw e
    toast.success(t('auth.passwordSaved'))
    await auth.refreshAal()
    await router.replace(auth.needsMfaEnroll ? { name: 'mfa-enroll' } : '/')
  } catch (e) {
    error.value = t(errorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthCard
    :title="t(route.query.flow === 'invite' ? 'auth.welcomeTitle' : 'auth.newPasswordTitle')"
    :description="t('auth.newPasswordSubtitle')"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <div class="grid gap-2">
        <Label for="new-password">{{ t('auth.newPassword') }}</Label>
        <Input
          id="new-password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>
      <div class="grid gap-2">
        <Label for="confirm-password">{{ t('auth.confirmPassword') }}</Label>
        <Input
          id="confirm-password"
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>
      <PasswordRules :password="password" />
      <p v-if="confirm && password !== confirm" class="text-destructive text-sm">
        {{ t('auth.passwordsDiffer') }}
      </p>
      <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
      <Button type="submit" size="lg" :disabled="busy || !valid">
        <KeyRound />
        {{ t('auth.savePassword') }}
      </Button>
    </form>
  </AuthCard>
</template>
