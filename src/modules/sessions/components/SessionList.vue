<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Home, Pencil, Play, Stethoscope } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { getActivity } from '@/modules/activities/registry'
import type { SessionListRow } from '../api'
import SessionStatusBadge from './SessionStatusBadge.vue'
import PatientLabel from '@/modules/patients/names/PatientLabel.vue'

defineProps<{ sessions: SessionListRow[]; showPatient?: boolean }>()
const { t, d } = useI18n()
const router = useRouter()
</script>

<template>
  <ul class="grid gap-2">
    <li
      v-for="s in sessions"
      :key="s.id"
      class="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3"
      data-testid="session-row"
    >
      <component
        :is="s.mode === 'home' ? Home : Stethoscope"
        class="text-muted-foreground size-5 shrink-0"
        :aria-label="t(`sessions.mode.${s.mode}`)"
      />
      <div class="min-w-40 flex-1">
        <p class="font-medium">
          <RouterLink
            v-if="showPatient && s.patients"
            :to="{ name: 'patient', params: { id: s.patient_id } }"
            class="mr-2 hover:underline"
            ><PatientLabel :patient="s.patients"
          /></RouterLink>
          {{ s.title || t('sessions.untitled') }}
        </p>
        <p class="text-muted-foreground text-xs">
          {{ d(new Date(s.scheduled_for), 'medium') }} ·
          <span
            v-for="(it, i) in s.session_items"
            :key="i"
            :title="t(`activity.${it.activity_id}.name`)"
            >{{ getActivity(it.activity_id)?.icon }}</span
          >
        </p>
      </div>
      <SessionStatusBadge :status="s.status" />
      <div class="flex gap-1">
        <Button
          v-if="s.status === 'planned'"
          variant="ghost"
          size="icon"
          :aria-label="t('common.edit')"
          @click="router.push({ name: 'session-edit', params: { id: s.id } })"
        >
          <Pencil />
        </Button>
        <Button
          v-if="s.status !== 'completed' && s.status !== 'cancelled'"
          size="sm"
          data-testid="run-session"
          @click="router.push({ name: 'session-run', params: { id: s.id } })"
        >
          <Play /> {{ s.status === 'in_progress' ? t('sessions.resume') : t('sessions.start') }}
        </Button>
      </div>
    </li>
  </ul>
</template>
