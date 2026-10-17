<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Archive, ArchiveRestore, CalendarPlus, Download, Lock, Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { downloadJson } from '@/shared/lib/download'
import { errorKey } from '@/shared/api/errors'
import { useAuthStore } from '@/modules/auth/store'
import PatientSessions from '@/modules/sessions/components/PatientSessions.vue'
import PatientResults from '@/modules/results/components/PatientResults.vue'
import PatientOverview from '@/modules/results/components/PatientOverview.vue'
import { exportPatientData, useDeletePatient, usePatient, useUpdatePatient } from '../api'
import { patientAge, patientAgeGroup } from '../helpers'
import PatientFormDialog from '../components/PatientFormDialog.vue'
import ConditionsEditor from '../components/ConditionsEditor.vue'
import UnlockNamesDialog from '../names/UnlockNamesDialog.vue'
import { useNamesStore } from '../names/store'

const { t, d } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() => String(route.params.id))
const { data: patient, isLoading } = usePatient(id)
const update = useUpdatePatient()
const remove = useDeletePatient()
const tab = ref(String(route.query.tab ?? 'overview'))
const editOpen = ref(false)
const deleteOpen = ref(false)

const isOwner = computed(() => auth.currentMembership?.role === 'owner')
const names = useNamesStore()
const unlockOpen = ref(false)
watchEffect(() => {
  if (patient.value && names.status === 'unlocked') void names.decryptAll([patient.value])
})
const fullName = computed(() => names.label(patient.value))

async function toggleArchive() {
  if (!patient.value) return
  try {
    await update.mutateAsync({
      id: patient.value.id,
      patch: { archived_at: patient.value.archived_at ? null : new Date().toISOString() },
    })
    toast.success(patient.value.archived_at ? t('patients.archived') : t('patients.restored'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}

async function exportData() {
  if (!patient.value) return
  try {
    const doc = await exportPatientData(patient.value, names.nameOf(patient.value))
    downloadJson(doc, `sinapsi-${patient.value.code}-${new Date().toISOString().slice(0, 10)}.json`)
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}

async function confirmDelete() {
  if (!patient.value) return
  try {
    await remove.mutateAsync({ id: patient.value.id, code: patient.value.code })
    toast.success(t('patients.deleted', { code: patient.value.code }))
    await router.replace({ name: 'patients' })
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div v-if="isLoading" class="grid gap-4">
    <Skeleton class="h-20" />
    <Skeleton class="h-64" />
  </div>
  <div v-else-if="patient">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-muted-foreground text-sm">{{ t('patients.patient') }}</p>
        <h1 v-if="fullName" class="text-3xl font-bold tracking-tight" data-testid="patient-name">
          {{ fullName }}
        </h1>
        <p
          class="font-mono font-bold tracking-tight"
          :class="fullName ? 'text-muted-foreground text-base' : 'text-3xl'"
          data-testid="patient-code"
        >
          {{ patient.code }}
          <button
            v-if="names.status === 'locked' && patient.name_enc"
            class="text-muted-foreground hover:text-foreground ml-2 inline-flex items-center gap-1 align-middle font-sans text-xs font-normal"
            @click="unlockOpen = true"
          >
            <Lock class="size-3.5" /> {{ t('patients.names.showName') }}
          </button>
        </p>
        <div class="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span v-if="patientAge(patient) !== null">{{
            t('patients.ageYears', { n: patientAge(patient) })
          }}</span>
          <Badge variant="outline">{{ t(`common.ageGroups.${patientAgeGroup(patient)}`) }}</Badge>
          <span v-if="patient.sex">· {{ t(`patients.sex${patient.sex}`) }}</span>
          <span v-if="patient.education_years !== null"
            >· {{ t('patients.educationShort', { n: patient.education_years }) }}</span
          >
          <span v-if="patient.handedness">· {{ t(`patients.hand.${patient.handedness}`) }}</span>
          <Badge v-if="patient.archived_at" variant="warning">{{
            t('patients.archivedBadge')
          }}</Badge>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="editOpen = true"
          ><Pencil /> {{ t('common.edit') }}</Button
        >
        <Button
          data-testid="new-session"
          @click="router.push({ name: 'session-new', query: { patient: patient.id } })"
        >
          <CalendarPlus /> {{ t('sessions.new') }}
        </Button>
      </div>
    </header>

    <Tabs v-model="tab">
      <TabsList>
        <TabsTrigger value="overview">{{ t('patients.tabs.overview') }}</TabsTrigger>
        <TabsTrigger value="sessions">{{ t('patients.tabs.sessions') }}</TabsTrigger>
        <TabsTrigger value="results" data-testid="tab-results">{{
          t('patients.tabs.results')
        }}</TabsTrigger>
        <TabsTrigger value="profile">{{ t('patients.tabs.profile') }}</TabsTrigger>
        <TabsTrigger value="privacy">{{ t('patients.tabs.privacy') }}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview"><PatientOverview :patient="patient" /></TabsContent>
      <TabsContent value="sessions"><PatientSessions :patient="patient" /></TabsContent>
      <TabsContent value="results"><PatientResults :patient="patient" /></TabsContent>

      <TabsContent value="profile" class="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('patients.conditionsTitle') }}</CardTitle>
            <CardDescription>{{ t('patients.conditionsHelp') }}</CardDescription>
          </CardHeader>
          <CardContent><ConditionsEditor :patient-id="patient.id" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{{ t('patients.notes') }}</CardTitle>
            <CardDescription>{{
              t('patients.createdOn', { date: d(new Date(patient.created_at), 'medium') })
            }}</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-sm whitespace-pre-line">{{ patient.notes || '—' }}</p>
            <Button variant="link" class="mt-2 px-0" @click="editOpen = true">{{
              t('common.edit')
            }}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="privacy" class="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('patients.privacy.exportTitle') }}</CardTitle>
            <CardDescription>{{ t('patients.privacy.exportHelp') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" data-testid="export-patient" @click="exportData"
              ><Download /> {{ t('patients.privacy.export') }}</Button
            >
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{{
              patient.archived_at
                ? t('patients.privacy.restoreTitle')
                : t('patients.privacy.archiveTitle')
            }}</CardTitle>
            <CardDescription>{{ t('patients.privacy.archiveHelp') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" @click="toggleArchive">
              <component :is="patient.archived_at ? ArchiveRestore : Archive" />
              {{
                patient.archived_at ? t('patients.privacy.restore') : t('patients.privacy.archive')
              }}
            </Button>
          </CardContent>
        </Card>
        <Card class="border-destructive/40">
          <CardHeader>
            <CardTitle>{{ t('patients.privacy.deleteTitle') }}</CardTitle>
            <CardDescription>{{ t('patients.privacy.deleteHelp') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              :disabled="!isOwner"
              data-testid="delete-patient"
              @click="deleteOpen = true"
            >
              <Trash2 /> {{ t('patients.privacy.delete') }}
            </Button>
            <p v-if="!isOwner" class="text-muted-foreground mt-2 text-xs">
              {{ t('patients.privacy.ownerOnly') }}
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <PatientFormDialog v-model:open="editOpen" :patient="patient" />
    <UnlockNamesDialog v-model:open="unlockOpen" />
    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('patients.privacy.deleteConfirmTitle', { code: patient.code })"
      :description="t('patients.privacy.deleteConfirmText')"
      :confirm-label="t('patients.privacy.delete')"
      :type-to-confirm="patient.code"
      :busy="remove.isPending.value"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>
