<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button } from '@/shared/ui/button'
import AuthCard from '../components/AuthCard.vue'
import { useAuthStore } from '../store'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

async function signOut() {
  await auth.signOut()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <AuthCard :title="t('auth.noOrgTitle')" :description="t('auth.noOrgSubtitle')">
    <Button variant="outline" @click="signOut">{{ t('common.signOut') }}</Button>
  </AuthCard>
</template>
