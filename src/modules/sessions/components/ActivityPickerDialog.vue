<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Plus } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import ActivityCard from '@/modules/activities/components/ActivityCard.vue'
import ActivityFilters from '@/modules/activities/components/ActivityFilters.vue'
import { useFilteredActivities } from '@/modules/activities/useFilteredActivities'
import type { AgeGroup } from '@/modules/activities/taxonomy'

const props = defineProps<{ ageGroup?: AgeGroup }>()
const emit = defineEmits<{ pick: [activityId: string] }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const { filters, list } = useFilteredActivities({ ageGroup: props.ageGroup ?? null })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ t('sessions.addActivity') }}</DialogTitle>
        <DialogDescription>{{ t('sessions.addActivityHelp') }}</DialogDescription>
      </DialogHeader>
      <ActivityFilters v-model="filters" />
      <div class="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        <ActivityCard v-for="a in list" :key="a.id" :activity="a" compact>
          <Button size="sm" data-testid="pick-activity" @click="emit('pick', a.id)"
            ><Plus /> {{ t('common.add') }}</Button
          >
        </ActivityCard>
      </div>
    </DialogContent>
  </Dialog>
</template>
