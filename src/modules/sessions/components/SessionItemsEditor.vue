<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueDraggable } from 'vue-draggable-plus'
import { GripVertical, Lock, LockOpen, Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Tooltip } from '@/shared/ui/tooltip'
import { getActivity } from '@/modules/activities/registry'
import type { AgeGroup } from '@/modules/activities/taxonomy'
import DifficultyPicker from '@/modules/activities/components/DifficultyPicker.vue'
import type { PlanItem } from '../api'
import ActivityPickerDialog from './ActivityPickerDialog.vue'

const items = defineModel<PlanItem[]>({ required: true })
defineProps<{ ageGroup?: AgeGroup }>()
const { t } = useI18n()
const pickerOpen = ref(false)

/** Stable keys for drag-and-drop (items have no id before saving). */
let nextKey = 1
const keyed = computed({
  get: () =>
    items.value.map((it) =>
      Object.assign(it, { _k: (it as PlanItem & { _k?: number })._k ?? nextKey++ }),
    ),
  set: (v) => (items.value = v),
})

const totalMinutes = computed(() =>
  items.value.reduce((s, it) => s + (getActivity(it.activity_id)?.estimatedMinutes ?? 3), 0),
)

function add(activityId: string) {
  items.value = [
    ...items.value,
    { activity_id: activityId, difficulty: null, locked: false, config: {} },
  ]
  pickerOpen.value = false
}

function update(index: number, patch: Partial<PlanItem>) {
  items.value = items.value.map((it, i) => (i === index ? { ...it, ...patch } : it))
}

function remove(index: number) {
  items.value = items.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div class="grid gap-3">
    <VueDraggable v-model="keyed" :animation="150" handle=".drag-handle" class="grid gap-2">
      <div
        v-for="(item, i) in keyed"
        :key="(item as PlanItem & { _k: number })._k"
        class="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3"
        data-testid="session-item"
      >
        <button
          class="drag-handle text-muted-foreground cursor-grab touch-none"
          :aria-label="t('sessions.reorder')"
        >
          <GripVertical class="size-5" />
        </button>
        <span class="text-muted-foreground w-5 text-sm tabular-nums">{{ i + 1 }}</span>
        <span class="text-2xl" aria-hidden="true">{{ getActivity(item.activity_id)?.icon }}</span>
        <div class="min-w-40 flex-1">
          <p class="font-medium">{{ t(`activity.${item.activity_id}.name`) }}</p>
          <p class="text-muted-foreground text-xs">
            {{
              item.difficulty === null
                ? t('sessions.adaptiveHelp')
                : item.locked
                  ? t('sessions.lockedHelp')
                  : t('sessions.startHelp')
            }}
          </p>
        </div>
        <DifficultyPicker
          :model-value="item.difficulty"
          class="min-w-64 flex-1"
          @update:model-value="update(i, { difficulty: $event })"
        />
        <Tooltip
          v-if="item.difficulty !== null"
          :text="item.locked ? t('sessions.unlock') : t('sessions.lock')"
        >
          <Button
            variant="ghost"
            size="icon"
            :aria-pressed="item.locked"
            @click="update(i, { locked: !item.locked })"
          >
            <Lock v-if="item.locked" /><LockOpen v-else />
          </Button>
        </Tooltip>
        <Button variant="ghost" size="icon" :aria-label="t('common.remove')" @click="remove(i)"
          ><Trash2
        /></Button>
      </div>
    </VueDraggable>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" data-testid="add-activity" @click="pickerOpen = true"
        ><Plus /> {{ t('sessions.addActivity') }}</Button
      >
      <span v-if="items.length" class="text-muted-foreground text-sm">
        {{ t('sessions.estimate', { n: items.length, min: totalMinutes }) }}
      </span>
    </div>
    <ActivityPickerDialog v-model:open="pickerOpen" :age-group="ageGroup" @pick="add" />
  </div>
</template>
