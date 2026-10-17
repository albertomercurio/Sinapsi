<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Copy, ShieldCheck } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { supabase } from '@/shared/api/supabase'
import { errorKey } from '@/shared/api/errors'
import { toast } from '@/shared/ui/toast'
import AuthCard from '../components/AuthCard.vue'
import TotpInput from '../components/TotpInput.vue'
import { useAuthStore } from '../store'

const { t, d } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

/** `?extra=1` = adding a backup authenticator from the security settings. */
const extra = route.query.extra === '1'
const factorId = ref<string | null>(null)
const qr = ref<string | null>(null)
const secret = ref<string | null>(null)
const code = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    // Abandoned enrollments leave unverified factors behind: clean them up first.
    const { data: list } = await supabase.auth.mfa.listFactors()
    for (const f of list?.all ?? []) {
      if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error: e } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Sinapsi ${d(new Date(), 'dateTime')}`,
      issuer: 'Sinapsi',
    })
    if (e) throw e
    factorId.value = data.id
    qr.value = data.totp.qr_code
    secret.value = data.totp.secret
  } catch (e) {
    error.value = t(errorKey(e))
  }
})

async function copySecret() {
  if (!secret.value) return
  await navigator.clipboard.writeText(secret.value)
  toast.success(t('auth.secretCopied'))
}

async function verify() {
  if (!factorId.value) return
  busy.value = true
  error.value = null
  try {
    await auth.verifyTotp(factorId.value, code.value)
    toast.success(t('auth.mfaEnabled'))
    if (extra) {
      await router.replace({ name: 'settings-security' })
    } else {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      await router.replace(redirect.startsWith('/') ? redirect : '/')
    }
  } catch (e) {
    error.value = t(errorKey(e))
    code.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthCard
    :title="t(extra ? 'auth.enrollExtraTitle' : 'auth.enrollTitle')"
    :description="t('auth.enrollSubtitle')"
  >
    <ol class="text-muted-foreground mb-5 grid list-decimal gap-1 pl-5 text-sm">
      <li>{{ t('auth.enrollStep1') }}</li>
      <li>{{ t('auth.enrollStep2') }}</li>
      <li>{{ t('auth.enrollStep3') }}</li>
    </ol>
    <div class="mb-5 flex flex-col items-center gap-3">
      <Skeleton v-if="!qr" class="size-48" />
      <img
        v-else
        :src="qr"
        :alt="t('auth.qrAlt')"
        class="size-48 rounded-lg border bg-white p-2"
        data-testid="totp-qr"
      />
      <button
        v-if="secret"
        type="button"
        class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-xs break-all"
        data-testid="totp-secret"
        :data-secret="secret"
        @click="copySecret"
      >
        <Copy class="size-3.5 shrink-0" /> {{ secret }}
      </button>
    </div>
    <form class="grid gap-4" @submit.prevent="verify">
      <TotpInput v-model="code" />
      <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
      <Button
        type="submit"
        size="lg"
        :disabled="busy || code.length !== 6 || !factorId"
        data-testid="totp-submit"
      >
        <ShieldCheck />
        {{ t('auth.activate') }}
      </Button>
    </form>
  </AuthCard>
</template>
