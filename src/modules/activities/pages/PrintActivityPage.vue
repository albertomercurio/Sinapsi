<script setup lang="ts">
import { computed, defineAsyncComponent, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Printer, Shuffle } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { NativeSelect } from '@/shared/ui/select'
import { createRng, randomSeed } from '@/shared/lib/rng'
import { loadContentPack } from '@/content'
import { currentLocale } from '@/app/i18n'
import { getActivity } from '../registry'
import type { AgeGroup } from '../taxonomy'
import DifficultyPicker from '../components/DifficultyPicker.vue'

const { t, d } = useI18n()
const route = useRoute()
const router = useRouter()
const activity = computed(() => getActivity(String(route.params.id)))
const Print = computed(() =>
  activity.value?.print ? defineAsyncComponent(activity.value.print) : null,
)

const difficulty = ref<number | null>(Number(route.query.difficulty ?? 2))
const ageGroup = ref<AgeGroup>((route.query.age as AgeGroup) ?? 'adult')
const code = ref(String(route.query.code ?? ''))
const copies = ref(1)
const seed = ref(randomSeed())
const instances = shallowRef<unknown[]>([])

function printPage() {
  window.print()
}

const ageOptions = computed(() =>
  (['child', 'adult', 'senior'] as const).map((a) => ({
    value: a,
    label: t(`common.ageGroups.${a}`),
  })),
)

watch(
  [difficulty, ageGroup, copies, seed, activity],
  async () => {
    const a = activity.value
    if (!a) return
    const content = await loadContentPack(currentLocale())
    const config = a.configSchema.parse(a.configFor(difficulty.value ?? 2, ageGroup.value))
    instances.value = Array.from({ length: Math.max(1, Math.min(10, copies.value)) }, (_, i) =>
      a.generate({
        rng: createRng(seed.value).fork(i),
        config,
        difficulty: difficulty.value ?? 2,
        ageGroup: ageGroup.value,
        locale: currentLocale(),
        content,
      }),
    )
  },
  { immediate: true },
)
</script>

<template>
  <div class="bg-background min-h-dvh">
    <div class="no-print mx-auto grid max-w-4xl gap-4 px-4 py-6">
      <Button variant="ghost" class="w-fit" @click="router.back()"
        ><ArrowLeft /> {{ t('common.back') }}</Button
      >
      <h1 class="text-xl font-semibold">
        {{ t('activities.printTitle') }} — {{ activity ? t(`activity.${activity.id}.name`) : '' }}
      </h1>
      <div class="grid items-end gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div class="grid gap-2">
          <Label>{{ t('common.difficulty') }}</Label>
          <DifficultyPicker v-model="difficulty" :allow-adaptive="false" />
        </div>
        <div class="grid gap-2">
          <Label>{{ t('activities.ageGroup') }}</Label>
          <NativeSelect
            v-model="ageGroup"
            :options="ageOptions"
            :aria-label="t('activities.ageGroup')"
          />
        </div>
        <div class="grid gap-2">
          <Label for="copies">{{ t('activities.copies') }}</Label>
          <Input id="copies" v-model.number="copies" type="number" min="1" max="10" />
        </div>
        <div class="grid gap-2">
          <Label for="pcode">{{ t('patients.code') }}</Label>
          <Input id="pcode" v-model="code" class="font-mono uppercase" maxlength="13" />
        </div>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="seed = randomSeed()"
          ><Shuffle /> {{ t('activities.newVariant') }}</Button
        >
        <Button @click="printPage"><Printer /> {{ t('common.print') }}</Button>
      </div>
      <p class="text-muted-foreground text-sm">{{ t('activities.printHelp') }}</p>
    </div>
    <div class="grid gap-6 pb-10 print:gap-0 print:pb-0">
      <component
        :is="Print"
        v-for="(inst, i) in instances"
        :key="`${seed}-${i}`"
        :instance="inst"
        :code="code.toUpperCase()"
        :date-label="d(new Date(), 'short')"
      />
    </div>
  </div>
</template>
