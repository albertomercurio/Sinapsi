<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ShieldCheck } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toast } from '@/shared/ui/toast'
import { errorKey } from '@/shared/api/errors'
import type { Patient } from '@/shared/api/types'
import { currentLocale } from '@/app/i18n'
import { useAuthStore } from '@/modules/auth/store'
import { type PatientInput, useCreatePatient, useUpdatePatient } from '../api'
import PatientForm from './PatientForm.vue'

const props = defineProps<{ patient?: Patient | null }>()
const emit = defineEmits<{ saved: [patient: Patient] }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const auth = useAuthStore()
const create = useCreatePatient()
const update = useUpdatePatient()

function blank(): PatientInput {
  return {
    birth_year: null,
    sex: null,
    education_years: null,
    handedness: null,
    content_locale: currentLocale(),
    notes: null,
    target_success: 0.75,
    ui_prefs: {},
  }
}

function fromPatient(p: Patient): PatientInput {
  return {
    birth_year: p.birth_year,
    sex: p.sex as PatientInput['sex'],
    education_years: p.education_years,
    handedness: p.handedness as PatientInput['handedness'],
    content_locale: p.content_locale,
    notes: p.notes,
    target_success: Number(p.target_success),
    ui_prefs: (p.ui_prefs ?? {}) as PatientInput['ui_prefs'],
  }
}

const form = ref<PatientInput>(blank())
watch(open, (v) => {
  if (v) form.value = props.patient ? fromPatient(props.patient) : blank()
})

async function save() {
  try {
    const payload = { ...form.value, notes: form.value.notes?.trim() || null }
    const saved = props.patient
      ? await update.mutateAsync({ id: props.patient.id, patch: payload })
      : await create.mutateAsync({ ...payload, org_id: auth.currentOrgId! })
    toast.success(props.patient ? t('common.saved') : t('patients.created', { code: saved.code }))
    emit('saved', saved)
    open.value = false
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{
          patient ? t('patients.editTitle', { code: patient.code }) : t('patients.newTitle')
        }}</DialogTitle>
        <DialogDescription>{{ t('patients.formSubtitle') }}</DialogDescription>
      </DialogHeader>
      <Alert v-if="!patient" variant="info">
        <ShieldCheck />
        <AlertDescription>{{ t('patients.pseudonymNotice') }}</AlertDescription>
      </Alert>
      <PatientForm v-model="form" />
      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button
          :disabled="create.isPending.value || update.isPending.value"
          data-testid="save-patient"
          @click="save"
        >
          {{ t('common.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
