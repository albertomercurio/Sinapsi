<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { NativeSelect } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { Slider } from '@/shared/ui/slider'
import { Textarea } from '@/shared/ui/textarea'
import { SUPPORTED_LOCALES } from '@/app/i18n'
import type { PatientInput } from '../api'

const model = defineModel<PatientInput>({ required: true })
const { t } = useI18n()
const thisYear = new Date().getFullYear()

const sexOptions = computed(() => [
  { value: null, label: t('patients.unspecified') },
  { value: 'F', label: t('patients.sexF') },
  { value: 'M', label: t('patients.sexM') },
  { value: 'X', label: t('patients.sexX') },
])
const handOptions = computed(() => [
  { value: null, label: t('patients.unspecified') },
  { value: 'right', label: t('patients.hand.right') },
  { value: 'left', label: t('patients.hand.left') },
  { value: 'ambi', label: t('patients.hand.ambi') },
])
const localeOptions = SUPPORTED_LOCALES.map((l) => ({ value: l.code as string, label: l.label }))
const themeOptions = computed(() => [
  { value: 'standard', label: t('patients.prefs.themeStandard') },
  { value: 'kids', label: t('patients.prefs.themeKids') },
])
const fontOptions = computed(() => [
  { value: 1, label: t('patients.prefs.fontNormal') },
  { value: 1.15, label: t('patients.prefs.fontLarge') },
  { value: 1.3, label: t('patients.prefs.fontXL') },
])

function num(v: string | number | null | undefined): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const birthYear = computed({
  get: () => model.value.birth_year ?? '',
  set: (v) => (model.value = { ...model.value, birth_year: num(v) }),
})
const education = computed({
  get: () => model.value.education_years ?? '',
  set: (v) => (model.value = { ...model.value, education_years: num(v) }),
})
const target = computed({
  get: () => [Math.round(model.value.target_success * 100)],
  set: (v: number[]) => (model.value = { ...model.value, target_success: (v[0] ?? 75) / 100 }),
})
function setPref<K extends keyof PatientInput['ui_prefs']>(
  key: K,
  value: PatientInput['ui_prefs'][K],
) {
  model.value = { ...model.value, ui_prefs: { ...model.value.ui_prefs, [key]: value } }
}
</script>

<template>
  <div class="grid gap-6">
    <fieldset class="grid gap-4 sm:grid-cols-2">
      <legend class="mb-2 text-sm font-semibold">{{ t('patients.form.demographics') }}</legend>
      <div class="grid gap-2">
        <Label for="birth-year">{{ t('patients.birthYear') }}</Label>
        <Input
          id="birth-year"
          v-model="birthYear"
          type="number"
          :min="1900"
          :max="thisYear"
          inputmode="numeric"
          data-testid="birth-year"
        />
      </div>
      <div class="grid gap-2">
        <Label>{{ t('patients.sex') }}</Label>
        <NativeSelect v-model="model.sex" :options="sexOptions" :aria-label="t('patients.sex')" />
      </div>
      <div class="grid gap-2">
        <Label for="education">{{ t('patients.educationYears') }}</Label>
        <Input
          id="education"
          v-model="education"
          type="number"
          min="0"
          max="30"
          inputmode="numeric"
        />
      </div>
      <div class="grid gap-2">
        <Label>{{ t('patients.handedness') }}</Label>
        <NativeSelect
          v-model="model.handedness"
          :options="handOptions"
          :aria-label="t('patients.handedness')"
        />
      </div>
    </fieldset>

    <fieldset class="grid gap-4">
      <legend class="mb-2 text-sm font-semibold">{{ t('patients.form.player') }}</legend>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="grid gap-2">
          <Label>{{ t('patients.contentLocale') }}</Label>
          <NativeSelect
            v-model="model.content_locale"
            :options="localeOptions"
            :aria-label="t('patients.contentLocale')"
          />
        </div>
        <div class="grid gap-2">
          <Label>{{ t('patients.prefs.theme') }}</Label>
          <NativeSelect
            :aria-label="t('patients.prefs.theme')"
            :model-value="model.ui_prefs.theme ?? 'standard'"
            :options="themeOptions"
            @update:model-value="setPref('theme', $event as 'standard' | 'kids')"
          />
        </div>
        <div class="grid gap-2">
          <Label>{{ t('patients.prefs.fontScale') }}</Label>
          <NativeSelect
            :aria-label="t('patients.prefs.fontScale')"
            :model-value="model.ui_prefs.font_scale ?? 1"
            :options="fontOptions"
            @update:model-value="setPref('font_scale', Number($event))"
          />
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          {{ t('patients.prefs.highContrast') }}
          <Switch
            :model-value="!!model.ui_prefs.high_contrast"
            @update:model-value="setPref('high_contrast', $event)"
          />
        </label>
        <label class="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          {{ t('patients.prefs.reducedMotion') }}
          <Switch
            :model-value="!!model.ui_prefs.reduced_motion"
            @update:model-value="setPref('reduced_motion', $event)"
          />
        </label>
        <label class="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          {{ t('patients.prefs.audio') }}
          <Switch
            :model-value="!!model.ui_prefs.audio"
            @update:model-value="setPref('audio', $event)"
          />
        </label>
      </div>
      <div class="grid gap-2">
        <Label>{{ t('patients.targetSuccess', { n: target[0] }) }}</Label>
        <Slider
          v-model="target"
          :min="60"
          :max="90"
          :step="5"
          :thumb-label="t('patients.targetSuccessShort')"
        />
        <p class="text-muted-foreground text-xs">{{ t('patients.targetSuccessHelp') }}</p>
      </div>
    </fieldset>

    <div class="grid gap-2">
      <Label for="notes"
        >{{ t('patients.notes') }}
        <span class="text-muted-foreground font-normal">({{ t('common.optional') }})</span></Label
      >
      <Textarea id="notes" v-model="model.notes" rows="3" maxlength="4000" />
      <p class="text-xs text-amber-700 dark:text-amber-300">{{ t('patients.noIdentifiers') }}</p>
    </div>
  </div>
</template>
