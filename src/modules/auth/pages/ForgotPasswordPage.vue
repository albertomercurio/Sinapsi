<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mail } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { supabase } from '@/shared/api/supabase'
import { errorKey } from '@/shared/api/errors'
import AuthCard from '../components/AuthCard.vue'

const { t } = useI18n()
const email = ref('')
const busy = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

async function submit() {
  busy.value = true
  error.value = null
  try {
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })
    if (e) throw e
    sent.value = true
  } catch (e) {
    error.value = t(errorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthCard :title="t('auth.forgotTitle')" :description="t('auth.forgotSubtitle')">
    <p v-if="sent" class="text-sm" role="status">{{ t('auth.forgotSent') }}</p>
    <form v-else class="grid gap-4" @submit.prevent="submit">
      <div class="grid gap-2">
        <Label for="email">{{ t('auth.email') }}</Label>
        <Input id="email" v-model="email" type="email" autocomplete="username" required />
      </div>
      <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
      <Button type="submit" size="lg" :disabled="busy">
        <Mail />
        {{ t('auth.sendLink') }}
      </Button>
    </form>
    <p class="text-muted-foreground mt-6 text-xs leading-relaxed">
      {{ t('auth.forgotAlternative') }}
    </p>
    <RouterLink
      :to="{ name: 'login' }"
      class="text-primary mt-4 inline-block text-sm hover:underline"
    >
      {{ t('auth.backToLogin') }}
    </RouterLink>
  </AuthCard>
</template>
