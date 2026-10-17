<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from '@lucide/vue'
import { Input } from '@/shared/ui/input'
import { NativeSelect } from '@/shared/ui/select'
import { DOMAIN_GROUPS } from '../taxonomy'

export interface ActivityFilterState {
  q: string
  group: string | null
  ageGroup: string | null
  format: string | null
}

const model = defineModel<ActivityFilterState>({ required: true })
const { t } = useI18n()

const groupOptions = computed(() => [
  { value: null, label: t('activities.allDomains') },
  ...DOMAIN_GROUPS.map((g) => ({ value: g.id as string, label: t(`activities.groups.${g.id}`) })),
])
const ageOptions = computed(() => [
  { value: null, label: t('activities.allAges') },
  ...(['child', 'adult', 'senior'] as const).map((a) => ({
    value: a as string,
    label: t(`common.ageGroups.${a}`),
  })),
])
const formatOptions = computed(() => [
  { value: null, label: t('activities.allFormats') },
  { value: 'digital', label: t('common.formats.digital') },
  { value: 'paper', label: t('common.formats.paper') },
])
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    <div class="relative">
      <Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input v-model="model.q" class="pl-9" :placeholder="t('common.search')" />
    </div>
    <NativeSelect
      v-model="model.group"
      :options="groupOptions"
      :aria-label="t('activities.allDomains')"
    />
    <NativeSelect
      v-model="model.ageGroup"
      :options="ageOptions"
      :aria-label="t('activities.ageGroup')"
    />
    <NativeSelect
      v-model="model.format"
      :options="formatOptions"
      :aria-label="t('activities.allFormats')"
    />
  </div>
</template>
