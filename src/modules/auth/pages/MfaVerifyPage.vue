<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { Factor } from '@supabase/supabase-js'
import { ShieldCheck } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { NativeSelect } from '@/shared/ui/select'
import { supabase } from '@/shared/api/supabase'
import { errorKey } from '@/shared/api/errors'
import AuthCard from '../components/AuthCard.vue'
import TotpInput from '../components/TotpInput.vue'
import { useAuthStore } from '../store'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const factors = ref<Factor[]>([])
const factorId = ref<string | null>(null)
const code = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const options = computed(() =>
  factors.value.map((f) => ({ value: f.id, label: f.friendly_name || t('auth.authenticator') })),
)

onMounted(async () => {
  const { data } = await supabase.auth.mfa.listFactors()
  factors.value = data?.totp ?? []
  factorId.value = factors.value[0]?.id ?? null
})

async function verify() {
  if (!factorId.value) return
  busy.value = true
  error.value = null
  try {
    await auth.verifyTotp(factorId.value, code.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect.startsWith('/') ? redirect : '/')
  } catch (e) {
    error.value = t(errorKey(e))
    code.value = ''
  } finally {
    busy.value = false
  }
}

async function cancel() {
  await auth.signOut()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <AuthCard :title="t('auth.verifyTitle')" :description="t('auth.verifySubtitle')">
    <form class="grid gap-4" @submit.prevent="verify">
      <NativeSelect
        v-if="factors.length > 1"
        v-model="factorId"
        :options="options"
        :aria-label="t('auth.authenticator')"
      />
      <TotpInput v-model="code" />
      <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
      <Button
        type="submit"
        size="lg"
        :disabled="busy || code.length !== 6"
        data-testid="totp-submit"
      >
        <ShieldCheck />
        {{ t('auth.verify') }}
      </Button>
      <Button type="button" variant="ghost" @click="cancel">{{ t('auth.useOtherAccount') }}</Button>
    </form>
    <p class="text-muted-foreground mt-6 text-xs leading-relaxed">{{ t('auth.lostDevice') }}</p>
  </AuthCard>
</template>
