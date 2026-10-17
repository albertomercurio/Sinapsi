<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Play, Save, Trash2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { NativeSelect } from '@/shared/ui/select'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { errorKey } from '@/shared/api/errors'
import type { SessionMode } from '@/shared/api/types'
import { useAuthStore } from '@/modules/auth/store'
import { usePatients } from '@/modules/patients/api'
import { patientAgeGroup } from '@/modules/patients/helpers'
import {
  cleanItems,
  itemsFromSession,
  localDateString,
  type PlanItem,
  useCreateSession,
  useDeleteSession,
  useSession,
  useTemplates,
  useUpdateSession,
} from '../api'
import SessionItemsEditor from '../components/SessionItemsEditor.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const editId = computed(() => (route.name === 'session-edit' ? String(route.params.id) : null))
const { data: existing } = useSession(editId)
const { data: patients } = usePatients(() => auth.currentOrgId)
const { data: templates } = useTemplates(() => auth.currentOrgId)
const create = useCreateSession()
const update = useUpdateSession()
const remove = useDeleteSession()

const patientId = ref<string | null>((route.query.patient as string) ?? null)
const title = ref('')
const date = ref(localDateString())
const mode = ref<SessionMode>('clinic')
const items = ref<PlanItem[]>([])
const templateId = ref<string | null>(null)
const deleteOpen = ref(false)

watch(existing, (s) => {
  if (!s) return
  patientId.value = s.patient_id
  title.value = s.title ?? ''
  date.value = s.scheduled_for
  mode.value = s.mode
  items.value = itemsFromSession(s.session_items)
})

const patient = computed(() => patients.value?.find((p) => p.id === patientId.value) ?? null)
const patientOptions = computed(() =>
  (patients.value ?? []).map((p) => ({ value: p.id, label: p.code })),
)
const templateOptions = computed(() => [
  { value: null, label: t('sessions.noTemplate') },
  ...(templates.value ?? []).map((tpl) => ({ value: tpl.id, label: tpl.title })),
])
const modeOptions = computed(() => [
  { value: 'clinic' as const, label: t('sessions.mode.clinic') },
  { value: 'home' as const, label: t('sessions.mode.home') },
])
const canSave = computed(() => !!patientId.value && items.value.length > 0 && !!date.value)

function applyTemplate(id: string | null | undefined) {
  templateId.value = id ?? null
  const tpl = templates.value?.find((x) => x.id === id)
  if (!tpl) return
  items.value = (tpl.items as unknown as PlanItem[]).map((i) => ({ ...i }))
  if (!title.value) title.value = tpl.title
}

async function save(run = false) {
  if (!canSave.value) return
  try {
    let id = editId.value
    if (id) {
      await update.mutateAsync({
        id,
        patch: { title: title.value || null, scheduled_for: date.value, mode: mode.value },
        items: cleanItems(items.value),
      })
    } else {
      id = await create.mutateAsync({
        patientId: patientId.value!,
        items: cleanItems(items.value),
        title: title.value || null,
        mode: mode.value,
        date: date.value,
        templateId: templateId.value,
      })
    }
    toast.success(t('sessions.saved'))
    if (run) await router.push({ name: 'session-run', params: { id } })
    else
      await router.push({
        name: 'patient',
        params: { id: patientId.value! },
        query: { tab: 'sessions' },
      })
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}

async function confirmDelete() {
  if (!editId.value) return
  try {
    await remove.mutateAsync(editId.value)
    await router.replace({
      name: 'patient',
      params: { id: patientId.value! },
      query: { tab: 'sessions' },
    })
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div class="mx-auto grid max-w-5xl gap-6">
    <div class="flex items-center justify-between gap-4">
      <Button variant="ghost" @click="router.back()"><ArrowLeft /> {{ t('common.back') }}</Button>
      <Button v-if="editId" variant="ghost" class="text-destructive" @click="deleteOpen = true"
        ><Trash2 /> {{ t('common.delete') }}</Button
      >
    </div>
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ editId ? t('sessions.editTitle') : t('sessions.newTitle') }}
    </h1>

    <Card>
      <CardContent class="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-4">
        <div class="grid gap-2">
          <Label>{{ t('patients.patient') }}</Label>
          <NativeSelect
            v-model="patientId"
            :aria-label="t('patients.patient')"
            :options="patientOptions"
            :placeholder="t('sessions.choosePatient')"
            class="font-mono"
            data-testid="session-patient"
          />
        </div>
        <div class="grid gap-2">
          <Label for="session-date">{{ t('common.date') }}</Label>
          <Input id="session-date" v-model="date" type="date" />
        </div>
        <div class="grid gap-2">
          <Label>{{ t('sessions.modeLabel') }}</Label>
          <NativeSelect
            v-model="mode"
            :options="modeOptions"
            :aria-label="t('sessions.modeLabel')"
          />
        </div>
        <div class="grid gap-2">
          <Label for="session-title"
            >{{ t('sessions.titleLabel') }}
            <span class="text-muted-foreground font-normal"
              >({{ t('common.optional') }})</span
            ></Label
          >
          <Input id="session-title" v-model="title" maxlength="120" />
        </div>
        <div v-if="!editId && templates?.length" class="grid gap-2 sm:col-span-2">
          <Label>{{ t('sessions.fromTemplate') }}</Label>
          <NativeSelect
            :aria-label="t('sessions.fromTemplate')"
            :model-value="templateId"
            :options="templateOptions"
            @update:model-value="applyTemplate"
          />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader
        ><CardTitle>{{ t('sessions.activities') }}</CardTitle></CardHeader
      >
      <CardContent>
        <SessionItemsEditor
          v-model="items"
          :age-group="patient ? patientAgeGroup(patient) : undefined"
        />
      </CardContent>
    </Card>

    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="outline" :disabled="!canSave" data-testid="save-session" @click="save(false)"
        ><Save /> {{ t('common.save') }}</Button
      >
      <Button :disabled="!canSave" data-testid="save-and-run" @click="save(true)"
        ><Play /> {{ t('sessions.saveAndStart') }}</Button
      >
    </div>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('sessions.deleteTitle')"
      :description="t('sessions.deleteText')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>
