<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { EmailOtpType } from '@supabase/supabase-js'
import { Loader2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { supabase } from '@/shared/api/supabase'
import { errorKey } from '@/shared/api/errors'
import AuthCard from '../components/AuthCard.vue'
import { useAuthStore } from '../store'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const error = ref<string | null>(null)

const allowed: EmailOtpType[] = ['invite', 'recovery', 'email_change', 'email']

onMounted(async () => {
  const tokenHash = String(route.query.token_hash ?? '')
  const type = String(route.query.type ?? '') as EmailOtpType
  if (!tokenHash || !allowed.includes(type)) {
    error.value = t('errors.linkInvalid')
    return
  }
  const { data, error: e } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (e) {
    error.value = t(errorKey(e))
    return
  }
  // Remove the one-time token from the address bar and history.
  window.history.replaceState(null, '', '/auth/confirm')
  await auth.syncSession()
  if (data.session && (type === 'invite' || type === 'recovery')) {
    await router.replace({ name: 'set-password', query: { flow: type } })
  } else {
    await router.replace('/')
  }
})
</script>

<template>
  <AuthCard :title="t('auth.confirmTitle')">
    <div v-if="!error" class="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 class="size-4 animate-spin" /> {{ t('common.loading') }}
    </div>
    <div v-else class="grid gap-4">
      <p class="text-destructive text-sm" role="alert">{{ error }}</p>
      <Button as-child variant="outline">
        <RouterLink :to="{ name: 'login' }">{{ t('auth.backToLogin') }}</RouterLink>
      </Button>
    </div>
  </AuthCard>
</template>
