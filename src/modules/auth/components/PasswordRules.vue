<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, X } from '@lucide/vue'

const props = defineProps<{ password: string }>()
const { t } = useI18n()

const rules = computed(() => [
  { ok: props.password.length >= 12, label: t('auth.rules.length') },
  { ok: /[a-z]/.test(props.password) && /[A-Z]/.test(props.password), label: t('auth.rules.case') },
  { ok: /\d/.test(props.password), label: t('auth.rules.digit') },
])
</script>

<template>
  <ul class="grid gap-1 text-sm">
    <li
      v-for="r in rules"
      :key="r.label"
      class="flex items-center gap-2"
      :class="r.ok ? 'text-success-strong' : 'text-muted-foreground'"
    >
      <component :is="r.ok ? Check : X" class="size-4" aria-hidden="true" />
      {{ r.label }}
    </li>
  </ul>
</template>
