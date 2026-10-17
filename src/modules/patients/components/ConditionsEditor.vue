<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, X } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { NativeSelect } from '@/shared/ui/select'
import { toast } from '@/shared/ui/toast'
import { errorKey } from '@/shared/api/errors'
import { CONDITION_CATEGORIES } from '@/modules/activities/taxonomy'
import { useAddCondition, usePatientConditions, useRemoveCondition } from '../api'

const props = defineProps<{ patientId: string }>()
const { t } = useI18n()
const { data: conditions } = usePatientConditions(() => props.patientId)
const add = useAddCondition()
const remove = useRemoveCondition()

const category = ref<string>('neuro.stroke')
const onset = ref<string | number>('')
const icd = ref('')

const options = computed(() =>
  CONDITION_CATEGORIES.map((c) => ({ value: c as string, label: t(`patients.conditions.${c}`) })),
)

async function submit() {
  try {
    await add.mutateAsync({
      patient_id: props.patientId,
      category: category.value,
      onset_year: onset.value === '' ? null : Number(onset.value),
      icd11_code: icd.value.trim().toUpperCase() || null,
      notes: null,
    })
    onset.value = ''
    icd.value = ''
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div class="grid gap-4">
    <div class="flex flex-wrap gap-2">
      <Badge
        v-for="c in conditions ?? []"
        :key="c.id"
        variant="secondary"
        class="gap-1.5 py-1 pr-1 text-sm"
      >
        {{ t(`patients.conditions.${c.category}`) }}
        <span v-if="c.onset_year" class="text-muted-foreground">({{ c.onset_year }})</span>
        <span v-if="c.icd11_code" class="text-muted-foreground font-mono">{{ c.icd11_code }}</span>
        <button
          class="hover:bg-background rounded p-0.5"
          :aria-label="t('common.remove')"
          @click="remove.mutate({ id: c.id, patient_id: patientId })"
        >
          <X class="size-3.5" />
        </button>
      </Badge>
      <p v-if="!conditions?.length" class="text-muted-foreground text-sm">
        {{ t('patients.noConditions') }}
      </p>
    </div>
    <form class="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]" @submit.prevent="submit">
      <NativeSelect
        v-model="category"
        :options="options"
        :aria-label="t('patients.conditionsTitle')"
      />
      <Input
        v-model="onset"
        type="number"
        min="1900"
        :max="new Date().getFullYear()"
        :placeholder="t('patients.onsetYear')"
      />
      <Input v-model="icd" maxlength="20" :placeholder="t('patients.icd11')" />
      <Button type="submit" variant="outline" :disabled="add.isPending.value"
        ><Plus /> {{ t('common.add') }}</Button
      >
    </form>
  </div>
</template>
