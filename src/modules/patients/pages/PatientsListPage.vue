<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Archive, Plus, Search, Users } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import PageHeader from '@/shared/components/PageHeader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import { useAuthStore } from '@/modules/auth/store'
import { usePatients } from '../api'
import { patientAge, patientAgeGroup } from '../helpers'
import PatientFormDialog from '../components/PatientFormDialog.vue'

const { t, d } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const archived = ref(false)
const q = ref('')
const createOpen = ref(false)
const { data, isLoading } = usePatients(() => auth.currentOrgId, archived)

const rows = computed(() => {
  const term = q.value.trim().toUpperCase()
  return (data.value ?? [])
    .filter((p) => !term || p.code.includes(term))
    .map((p) => {
      const done = p.sessions
        .filter((s) => s.status === 'completed')
        .map((s) => s.scheduled_for)
        .sort()
      const upcoming = p.sessions
        .filter((s) => s.status === 'planned')
        .map((s) => s.scheduled_for)
        .sort()
      return { ...p, lastSession: done.at(-1) ?? null, nextSession: upcoming[0] ?? null }
    })
})
</script>

<template>
  <div>
    <PageHeader :title="t('patients.title')" :description="t('patients.subtitle')">
      <template #actions>
        <Button variant="outline" @click="archived = !archived">
          <Archive /> {{ archived ? t('patients.showActive') : t('patients.showArchived') }}
        </Button>
        <Button data-testid="new-patient" @click="createOpen = true"
          ><Plus /> {{ t('patients.new') }}</Button
        >
      </template>
    </PageHeader>

    <div class="relative mb-4 max-w-sm">
      <Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input v-model="q" class="pl-9 font-mono uppercase" :placeholder="t('patients.searchCode')" />
    </div>

    <div v-if="isLoading" class="grid gap-2">
      <Skeleton v-for="i in 5" :key="i" class="h-12" />
    </div>
    <EmptyState
      v-else-if="!rows.length"
      :icon="Users"
      :title="archived ? t('patients.noArchived') : t('patients.empty')"
      :description="archived ? undefined : t('patients.emptyHint')"
    >
      <Button v-if="!archived" @click="createOpen = true"><Plus /> {{ t('patients.new') }}</Button>
    </EmptyState>
    <div v-else class="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('patients.code') }}</TableHead>
            <TableHead>{{ t('patients.age') }}</TableHead>
            <TableHead class="hidden md:table-cell">{{ t('patients.conditionsTitle') }}</TableHead>
            <TableHead class="hidden sm:table-cell">{{ t('patients.lastSession') }}</TableHead>
            <TableHead class="hidden lg:table-cell">{{ t('patients.nextSession') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="p in rows"
            :key="p.id"
            class="cursor-pointer"
            data-testid="patient-row"
            @click="router.push({ name: 'patient', params: { id: p.id } })"
          >
            <TableCell class="font-mono font-semibold">{{ p.code }}</TableCell>
            <TableCell>
              <span v-if="patientAge(p) !== null">{{ patientAge(p) }}</span>
              <span class="text-muted-foreground ml-2 text-xs">{{
                t(`common.ageGroups.${patientAgeGroup(p)}`)
              }}</span>
            </TableCell>
            <TableCell class="hidden md:table-cell">
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-for="c in p.patient_conditions.slice(0, 3)"
                  :key="c.category"
                  variant="secondary"
                >
                  {{ t(`patients.conditions.${c.category}`) }}
                </Badge>
              </div>
            </TableCell>
            <TableCell class="hidden sm:table-cell">{{
              p.lastSession ? d(new Date(p.lastSession), 'medium') : '—'
            }}</TableCell>
            <TableCell class="hidden lg:table-cell">{{
              p.nextSession ? d(new Date(p.nextSession), 'medium') : '—'
            }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <PatientFormDialog
      v-model:open="createOpen"
      @saved="(p) => router.push({ name: 'patient', params: { id: p.id } })"
    />
  </div>
</template>
