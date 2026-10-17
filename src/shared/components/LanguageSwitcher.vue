<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Languages } from '@lucide/vue'
import { SUPPORTED_LOCALES, setLocale, type LocaleCode } from '@/app/i18n'

const emit = defineEmits<{ change: [code: LocaleCode] }>()
const { locale, t } = useI18n()

const value = computed({
  get: () => locale.value as LocaleCode,
  set: async (code: LocaleCode) => {
    await setLocale(code)
    emit('change', code)
  },
})
</script>

<template>
  <label class="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
    <Languages class="size-4" aria-hidden="true" />
    <span class="sr-only">{{ t('common.language') }}</span>
    <select
      v-model="value"
      class="hover:text-foreground cursor-pointer bg-transparent py-1 outline-none focus-visible:underline"
      data-testid="language-switcher"
    >
      <option v-for="l in SUPPORTED_LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
    </select>
  </label>
</template>
