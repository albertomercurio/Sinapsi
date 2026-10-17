<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, Clock } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { errorKey } from '@/shared/api/errors'
import AuthCard from '../components/AuthCard.vue'
import { useAuthStore } from '../store'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

async function submit() {
  busy.value = true
  error.value = null
  try {
    await auth.signIn(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    await router.replace(redirect && redirect.startsWith('/') ? redirect : '/')
  } catch (e) {
    error.value = t(errorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthCard :title="t('auth.loginTitle')" :description="t('auth.loginSubtitle')">
    <Alert v-if="auth.signOutReason === 'idle'" variant="info" class="mb-4">
      <Clock />
      <AlertDescription>{{ t('auth.idleSignedOut') }}</AlertDescription>
    </Alert>
    <form class="grid gap-4" @submit.prevent="submit">
      <div class="grid gap-2">
        <Label for="email">{{ t('auth.email') }}</Label>
        <Input id="email" v-model="email" type="email" autocomplete="username" required />
      </div>
      <div class="grid gap-2">
        <div class="flex items-center justify-between">
          <Label for="password">{{ t('auth.password') }}</Label>
          <RouterLink
            :to="{ name: 'forgot-password' }"
            class="text-primary text-sm hover:underline"
          >
            {{ t('auth.forgot') }}
          </RouterLink>
        </div>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
      <Button type="submit" size="lg" :disabled="busy" data-testid="login-submit">
        <LogIn />
        {{ t('auth.signIn') }}
      </Button>
    </form>
    <p class="text-muted-foreground mt-6 text-xs leading-relaxed">{{ t('auth.inviteOnly') }}</p>
  </AuthCard>
</template>
