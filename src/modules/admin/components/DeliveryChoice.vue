<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Link, Mail } from '@lucide/vue'

/** How an invitation reaches the person: a link the admin sends personally, or an e-mail (needs SMTP). */
const model = defineModel<'link' | 'email'>({ default: 'link' })
const { t } = useI18n()
</script>

<template>
  <div
    class="bg-muted inline-flex rounded-lg p-0.5 text-sm"
    role="radiogroup"
    :aria-label="t('admin.delivery.label')"
  >
    <button
      type="button"
      role="radio"
      :aria-checked="model === 'link'"
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1"
      :class="model === 'link' ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground'"
      @click="model = 'link'"
    >
      <Link class="size-3.5" /> {{ t('admin.delivery.link') }}
    </button>
    <button
      type="button"
      role="radio"
      :aria-checked="model === 'email'"
      class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1"
      :class="model === 'email' ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground'"
      @click="model = 'email'"
    >
      <Mail class="size-3.5" /> {{ t('admin.delivery.email') }}
    </button>
  </div>
</template>
