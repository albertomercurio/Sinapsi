<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Play, Printer } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import PageHeader from '@/shared/components/PageHeader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import ActivityCard from '../components/ActivityCard.vue'
import ActivityFilters from '../components/ActivityFilters.vue'
import { useFilteredActivities } from '../useFilteredActivities'

const { t } = useI18n()
const { filters, list } = useFilteredActivities()
</script>

<template>
  <div>
    <PageHeader :title="t('activities.title')" :description="t('activities.subtitle')" />
    <ActivityFilters v-model="filters" class="mb-6" />
    <EmptyState v-if="!list.length" :title="t('activities.noMatch')" />
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ActivityCard v-for="a in list" :key="a.id" :activity="a">
        <Button as-child variant="outline" size="sm">
          <RouterLink :to="{ name: 'activity-try', params: { id: a.id } }"
            ><Play /> {{ t('activities.try') }}</RouterLink
          >
        </Button>
        <Button v-if="a.print" as-child variant="ghost" size="sm">
          <RouterLink :to="{ name: 'activity-print', params: { id: a.id } }"
            ><Printer /> {{ t('activities.printSheet') }}</RouterLink
          >
        </Button>
      </ActivityCard>
    </div>
  </div>
</template>
