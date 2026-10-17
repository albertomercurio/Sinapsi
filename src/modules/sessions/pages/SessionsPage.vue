<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, CalendarPlus, LayoutTemplate, Plus } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Skeleton } from '@/shared/ui/skeleton'
import PageHeader from '@/shared/components/PageHeader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import { getActivity } from '@/modules/activities/registry'
import { useAuthStore } from '@/modules/auth/store'
import { localDateString, type PlanItem, useSessionsInRange, useTemplates } from '../api'
import SessionList from '../components/SessionList.vue'

const { t, d } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tab = ref(String(route.query.tab ?? 'agenda'))

const from = localDateString(new Date(Date.now() - 7 * 86400000))
const to = localDateString(new Date(Date.now() + 30 * 86400000))
const { data: sessions, isLoading } = useSessionsInRange(() => auth.currentOrgId, from, to)
const { data: templates } = useTemplates(() => auth.currentOrgId)

const byDay = computed(() => {
  const map = new Map<string, NonNullable<typeof sessions.value>>()
  for (const s of sessions.value ?? [])
    map.set(s.scheduled_for, [...(map.get(s.scheduled_for) ?? []), s])
  return [...map.entries()]
})
</script>

<template>
  <div>
    <PageHeader :title="t('sessions.title')" :description="t('sessions.subtitle')">
      <template #actions>
        <Button variant="outline" @click="router.push({ name: 'template-new' })"
          ><LayoutTemplate /> {{ t('sessions.newTemplate') }}</Button
        >
        <Button @click="router.push({ name: 'session-new' })"
          ><CalendarPlus /> {{ t('sessions.new') }}</Button
        >
      </template>
    </PageHeader>
    <Tabs v-model="tab">
      <TabsList>
        <TabsTrigger value="agenda">{{ t('sessions.agenda') }}</TabsTrigger>
        <TabsTrigger value="templates">{{ t('sessions.templates') }}</TabsTrigger>
      </TabsList>
      <TabsContent value="agenda" class="grid gap-6">
        <Skeleton v-if="isLoading" class="h-40" />
        <EmptyState
          v-else-if="!byDay.length"
          :icon="CalendarDays"
          :title="t('sessions.emptyAgenda')"
        />
        <section v-for="[day, list] in byDay" :key="day">
          <h3 class="mb-2 text-sm font-semibold capitalize">{{ d(new Date(day), 'long') }}</h3>
          <SessionList :sessions="list" show-patient />
        </section>
      </TabsContent>
      <TabsContent value="templates">
        <EmptyState
          v-if="!templates?.length"
          :icon="LayoutTemplate"
          :title="t('sessions.noTemplates')"
          :description="t('sessions.noTemplatesHint')"
        >
          <Button @click="router.push({ name: 'template-new' })"
            ><Plus /> {{ t('sessions.newTemplate') }}</Button
          >
        </EmptyState>
        <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="tpl in templates"
            :key="tpl.id"
            :to="{ name: 'template-edit', params: { id: tpl.id } }"
            class="bg-card hover:border-primary/50 rounded-xl border p-4 transition-colors"
          >
            <p class="font-medium">{{ tpl.title }}</p>
            <p v-if="tpl.description" class="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {{ tpl.description }}
            </p>
            <p class="mt-2 text-lg">
              <span v-for="(it, i) in tpl.items as unknown as PlanItem[]" :key="i">{{
                getActivity(it.activity_id)?.icon
              }}</span>
            </p>
          </RouterLink>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
