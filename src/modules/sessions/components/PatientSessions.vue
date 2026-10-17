<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CalendarPlus, CalendarDays } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import EmptyState from '@/shared/components/EmptyState.vue'
import type { Patient } from '@/shared/api/types'
import { usePatientSessions } from '../api'
import SessionList from './SessionList.vue'

const props = defineProps<{ patient: Patient }>()
const { t } = useI18n()
const router = useRouter()
const { data, isLoading } = usePatientSessions(() => props.patient.id)
const upcoming = computed(() =>
  (data.value ?? []).filter((s) => s.status === 'planned' || s.status === 'in_progress').reverse(),
)
const past = computed(() =>
  (data.value ?? []).filter((s) => s.status === 'completed' || s.status === 'cancelled'),
)
</script>

<template>
  <div class="grid gap-6">
    <div class="flex justify-end">
      <Button @click="router.push({ name: 'session-new', query: { patient: patient.id } })"
        ><CalendarPlus /> {{ t('sessions.new') }}</Button
      >
    </div>
    <Skeleton v-if="isLoading" class="h-32" />
    <EmptyState
      v-else-if="!data?.length"
      :icon="CalendarDays"
      :title="t('sessions.emptyPatient')"
    />
    <template v-else>
      <section v-if="upcoming.length">
        <h3 class="mb-2 text-sm font-semibold">{{ t('sessions.upcoming') }}</h3>
        <SessionList :sessions="upcoming" />
      </section>
      <section v-if="past.length">
        <h3 class="mb-2 text-sm font-semibold">{{ t('sessions.past') }}</h3>
        <SessionList :sessions="past" />
      </section>
    </template>
  </div>
</template>
