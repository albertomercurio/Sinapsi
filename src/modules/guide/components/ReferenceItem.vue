<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ExternalLink } from '@lucide/vue'
import { REFERENCES } from '../content'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const item = computed(() => REFERENCES[props.id])
</script>

<template>
  <span v-if="item">
    {{ item.text }}
    <a
      v-if="item.url"
      :href="item.url"
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary-strong inline-flex items-center gap-0.5 font-medium whitespace-nowrap hover:underline"
      >{{ item.url.replace('https://doi.org/', 'doi:') }}
      <ExternalLink class="size-3" aria-hidden="true" /><span class="sr-only">{{
        t('guide.newTab')
      }}</span></a
    >
  </span>
</template>
