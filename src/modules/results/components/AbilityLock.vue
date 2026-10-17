<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Lock, LockOpen } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { toast } from '@/shared/ui/toast'
import { errorKey } from '@/shared/api/errors'
import type { PatientAbility } from '@/shared/api/types'
import DifficultyPicker from '@/modules/activities/components/DifficultyPicker.vue'
import { useLockAbility } from '../api'

const props = defineProps<{
  patientId: string
  activityId: string
  ability: PatientAbility | undefined
}>()
const { t } = useI18n()
const lock = useLockAbility()
const editing = ref(false)
const level = ref<number | null>(2)
watch(
  () => props.ability,
  (a) => (level.value = a?.locked_difficulty ? Number(a.locked_difficulty) : 2),
  { immediate: true },
)
const locked = computed(() => !!props.ability?.locked)

async function apply(lockIt: boolean) {
  try {
    await lock.mutateAsync({
      patientId: props.patientId,
      activityId: props.activityId,
      locked: lockIt,
      difficulty: level.value ?? 2,
      existing: !!props.ability,
    })
    editing.value = false
    toast.success(lockIt ? t('results.lockedTo', { n: level.value }) : t('results.unlocked'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 text-sm">
    <template v-if="!editing">
      <span v-if="locked" class="inline-flex items-center gap-1"
        ><Lock class="size-3.5" />
        {{ t('results.lockedAt', { n: Number(ability?.locked_difficulty).toFixed(1) }) }}</span
      >
      <span v-else class="text-muted-foreground inline-flex items-center gap-1"
        ><LockOpen class="size-3.5" /> {{ t('results.adaptiveOn') }}</span
      >
      <Button v-if="locked" size="sm" variant="ghost" @click="apply(false)">{{
        t('results.unlock')
      }}</Button>
      <Button v-else size="sm" variant="ghost" @click="editing = true">{{
        t('results.lock')
      }}</Button>
    </template>
    <template v-else>
      <DifficultyPicker v-model="level" :allow-adaptive="false" class="min-w-64" />
      <Button size="sm" @click="apply(true)">{{ t('common.confirm') }}</Button>
      <Button size="sm" variant="ghost" @click="editing = false">{{ t('common.cancel') }}</Button>
    </template>
  </div>
</template>
