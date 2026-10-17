<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CalendarDays, CalendarPlus, DatabaseBackup, Puzzle, UserPlus } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Skeleton } from '@/shared/ui/skeleton'
import EmptyState from '@/shared/components/EmptyState.vue'
import { useAuthStore } from '@/modules/auth/store'
import { usePatients } from '@/modules/patients/api'
import { localDateString, useSessionsInRange } from '@/modules/sessions/api'
import SessionList from '@/modules/sessions/components/SessionList.vue'
import { backupOverdue } from '@/modules/settings/backup'

const { t, d } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const today = localDateString()
const week = localDateString(new Date(Date.now() + 7 * 86400000))
const { data: sessions, isLoading } = useSessionsInRange(() => auth.currentOrgId, today, week)
const { data: patients } = usePatients(() => auth.currentOrgId)

const todays = computed(() =>
  (sessions.value ?? []).filter((s) => s.scheduled_for === today && s.status !== 'completed'),
)
const doneToday = computed(
  () =>
    (sessions.value ?? []).filter((s) => s.scheduled_for === today && s.status === 'completed')
      .length,
)
const upcoming = computed(() => (sessions.value ?? []).filter((s) => s.scheduled_for > today))
const showBackup = computed(
  () =>
    auth.currentMembership?.role === 'owner' &&
    (patients.value?.length ?? 0) > 0 &&
    backupOverdue(auth.currentOrgId!),
)
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 13
    ? t('dashboard.morning')
    : h < 18
      ? t('dashboard.afternoon')
      : t('dashboard.evening')
})
</script>

<template>
  <div class="grid gap-8">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-muted-foreground text-sm capitalize">{{ d(new Date(), 'long') }}</p>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ greeting
          }}{{
            auth.context?.profile?.display_name ? `, ${auth.context.profile.display_name}` : ''
          }}
        </h1>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="router.push({ name: 'patients' })"
          ><UserPlus /> {{ t('patients.new') }}</Button
        >
        <Button @click="router.push({ name: 'session-new' })"
          ><CalendarPlus /> {{ t('sessions.new') }}</Button
        >
      </div>
    </header>

    <Alert v-if="showBackup" variant="warning">
      <DatabaseBackup />
      <AlertTitle>{{ t('dashboard.backupTitle') }}</AlertTitle>
      <AlertDescription>
        <p>{{ t('dashboard.backupText') }}</p>
        <Button
          size="sm"
          variant="outline"
          class="mt-2"
          @click="router.push({ name: 'settings-privacy' })"
          >{{ t('dashboard.backupNow') }}</Button
        >
      </AlertDescription>
    </Alert>

    <section>
      <div class="mb-3 flex items-baseline justify-between">
        <h2 class="text-lg font-semibold">{{ t('dashboard.today') }}</h2>
        <span v-if="doneToday" class="text-muted-foreground text-sm">{{
          t('dashboard.doneToday', { n: doneToday })
        }}</span>
      </div>
      <Skeleton v-if="isLoading" class="h-24" />
      <EmptyState v-else-if="!todays.length" :icon="CalendarDays" :title="t('dashboard.noToday')">
        <Button variant="outline" @click="router.push({ name: 'session-new' })"
          ><CalendarPlus /> {{ t('sessions.new') }}</Button
        >
      </EmptyState>
      <SessionList v-else :sessions="todays" show-patient />
    </section>

    <section v-if="upcoming.length">
      <h2 class="mb-3 text-lg font-semibold">{{ t('dashboard.nextDays') }}</h2>
      <SessionList :sessions="upcoming" show-patient />
    </section>

    <section class="grid gap-3 sm:grid-cols-3">
      <RouterLink
        :to="{ name: 'patients' }"
        class="bg-card hover:border-primary/50 rounded-xl border p-4 transition-colors"
      >
        <p class="text-muted-foreground text-xs">{{ t('dashboard.activePatients') }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ patients?.length ?? '—' }}</p>
      </RouterLink>
      <RouterLink
        :to="{ name: 'sessions' }"
        class="bg-card hover:border-primary/50 rounded-xl border p-4 transition-colors"
      >
        <p class="text-muted-foreground text-xs">{{ t('dashboard.weekSessions') }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ sessions?.length ?? '—' }}</p>
      </RouterLink>
      <RouterLink
        :to="{ name: 'activities' }"
        class="bg-card hover:border-primary/50 flex items-center gap-3 rounded-xl border p-4 transition-colors"
      >
        <Puzzle class="text-primary size-6" />
        <div>
          <p class="font-medium">{{ t('dashboard.exploreActivities') }}</p>
          <p class="text-muted-foreground text-xs">{{ t('dashboard.exploreHint') }}</p>
        </div>
      </RouterLink>
    </section>
  </div>
</template>
