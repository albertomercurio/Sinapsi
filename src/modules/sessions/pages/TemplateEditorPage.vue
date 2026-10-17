<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Save, Trash2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { errorKey } from '@/shared/api/errors'
import { useAuthStore } from '@/modules/auth/store'
import { cleanItems, type PlanItem, useDeleteTemplate, useSaveTemplate, useTemplate } from '../api'
import SessionItemsEditor from '../components/SessionItemsEditor.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() => (route.params.id ? String(route.params.id) : null))
const { data: existing } = useTemplate(id)
const save = useSaveTemplate()
const remove = useDeleteTemplate()

const title = ref('')
const description = ref('')
const items = ref<PlanItem[]>([])
const deleteOpen = ref(false)

watch(existing, (tpl) => {
  if (!tpl) return
  title.value = tpl.title
  description.value = tpl.description ?? ''
  items.value = (tpl.items as unknown as PlanItem[]).map((i) => ({ ...i }))
})

async function submit() {
  try {
    await save.mutateAsync({
      id: id.value ?? undefined,
      org_id: auth.currentOrgId!,
      title: title.value.trim(),
      description: description.value.trim() || null,
      items: cleanItems(items.value),
    })
    toast.success(t('sessions.templateSaved'))
    await router.push({ name: 'sessions', query: { tab: 'templates' } })
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}

async function confirmDelete() {
  if (!id.value) return
  await remove.mutateAsync(id.value)
  await router.replace({ name: 'sessions', query: { tab: 'templates' } })
}
</script>

<template>
  <div class="mx-auto grid max-w-5xl gap-6">
    <div class="flex items-center justify-between">
      <Button variant="ghost" @click="router.back()"><ArrowLeft /> {{ t('common.back') }}</Button>
      <Button v-if="id" variant="ghost" class="text-destructive" @click="deleteOpen = true"
        ><Trash2 /> {{ t('common.delete') }}</Button
      >
    </div>
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ id ? t('sessions.editTemplate') : t('sessions.newTemplate') }}
    </h1>
    <Card>
      <CardContent class="grid gap-4 pt-1">
        <div class="grid gap-2">
          <Label for="tpl-title">{{ t('sessions.templateName') }}</Label>
          <Input id="tpl-title" v-model="title" maxlength="120" />
        </div>
        <div class="grid gap-2">
          <Label for="tpl-desc">{{ t('sessions.templateDescription') }}</Label>
          <Textarea id="tpl-desc" v-model="description" maxlength="1000" rows="2" />
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader
        ><CardTitle>{{ t('sessions.activities') }}</CardTitle></CardHeader
      >
      <CardContent><SessionItemsEditor v-model="items" /></CardContent>
    </Card>
    <div class="flex justify-end">
      <Button :disabled="!title.trim() || !items.length || save.isPending.value" @click="submit"
        ><Save /> {{ t('common.save') }}</Button
      >
    </div>
    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('sessions.deleteTemplateTitle')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>
