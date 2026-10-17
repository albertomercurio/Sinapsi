<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Play, RotateCcw } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { NativeSelect } from '@/shared/ui/select'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { SUPPORTED_LOCALES, currentLocale } from '@/app/i18n'
import { getActivity } from '../registry'
import type { AgeGroup } from '../taxonomy'
import ActivityHost from '../runtime/ActivityHost.vue'
import type { CompletedRun } from '../runtime/types'
import DifficultyPicker from '../components/DifficultyPicker.vue'
import RunMetricsTable from '../components/RunMetricsTable.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const activity = computed(() => getActivity(String(route.params.id)))

const stage = ref<'setup' | 'play' | 'summary'>('setup')
const difficulty = ref<number | null>(2)
const ageGroup = ref<AgeGroup>('adult')
const theme = ref<'standard' | 'kids'>('standard')
const contentLocale = ref<string>(currentLocale())
const run = shallowRef<CompletedRun | null>(null)
const key = ref(0)

const ageOptions = computed(() =>
  (['child', 'adult', 'senior'] as const).map((a) => ({
    value: a,
    label: t(`common.ageGroups.${a}`),
  })),
)
const themeOptions = computed(() => [
  { value: 'standard' as const, label: t('patients.prefs.themeStandard') },
  { value: 'kids' as const, label: t('patients.prefs.themeKids') },
])
const localeOptions = SUPPORTED_LOCALES.map((l) => ({ value: l.code as string, label: l.label }))

function start() {
  run.value = null
  key.value++
  stage.value = 'play'
}
</script>

<template>
  <div v-if="!activity" class="p-8">{{ t('errors.notFound') }}</div>
  <div v-else-if="stage === 'play'" class="h-dvh">
    <ActivityHost
      :key="key"
      :activity="activity"
      :difficulty="difficulty ?? 2"
      :age-group="ageGroup"
      :prefs="{ theme }"
      :content-locale="contentLocale"
      @complete="(r) => (run = r)"
      @next="stage = 'summary'"
    />
  </div>
  <div v-else class="bg-background min-h-dvh px-4 py-8">
    <div class="mx-auto grid max-w-3xl gap-6">
      <Button variant="ghost" class="w-fit" @click="router.push({ name: 'activities' })"
        ><ArrowLeft /> {{ t('activities.title') }}</Button
      >
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-3 text-xl">
            <span class="text-3xl">{{ activity.icon }}</span>
            {{ t(`activity.${activity.id}.name`) }}
          </CardTitle>
          <CardDescription>{{ t(`activity.${activity.id}.description`) }}</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-5">
          <Alert variant="info"
            ><AlertDescription>{{ t('activities.tryNotice') }}</AlertDescription></Alert
          >
          <div class="grid gap-2">
            <Label>{{ t('common.difficulty') }}</Label>
            <DifficultyPicker v-model="difficulty" :allow-adaptive="false" />
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="grid gap-2">
              <Label>{{ t('activities.ageGroup') }}</Label>
              <NativeSelect
                v-model="ageGroup"
                :options="ageOptions"
                :aria-label="t('activities.ageGroup')"
              />
            </div>
            <div class="grid gap-2">
              <Label>{{ t('patients.prefs.theme') }}</Label>
              <NativeSelect
                v-model="theme"
                :options="themeOptions"
                :aria-label="t('patients.prefs.theme')"
              />
            </div>
            <div class="grid gap-2">
              <Label>{{ t('patients.contentLocale') }}</Label>
              <NativeSelect
                v-model="contentLocale"
                :options="localeOptions"
                :aria-label="t('patients.contentLocale')"
              />
            </div>
          </div>
          <Button size="lg" class="w-fit" data-testid="try-start" @click="start">
            <component :is="run ? RotateCcw : Play" />
            {{ run ? t('activities.tryAgain') : t('activities.try') }}
          </Button>
        </CardContent>
      </Card>
      <Card v-if="run && stage === 'summary'">
        <CardHeader>
          <CardTitle>{{ t('activities.tryResults') }}</CardTitle>
          <CardDescription>{{ t('activities.tryResultsHelp') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <RunMetricsTable
            :activity="activity"
            :metrics="run.result.metrics"
            :score="run.result.score"
            :flags="run.qualityFlags"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
