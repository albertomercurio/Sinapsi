<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const props = defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  /** When set, the user must type this text to enable the confirm button. */
  typeToConfirm?: string
  busy?: boolean
}>()
const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const typed = ref('')

watch(open, (v) => {
  if (v) typed.value = ''
})

const canConfirm = computed(
  () =>
    !props.busy &&
    (!props.typeToConfirm ||
      typed.value.trim().toUpperCase() === props.typeToConfirm.toUpperCase()),
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>
      <slot />
      <div v-if="typeToConfirm" class="grid gap-2">
        <Label for="confirm-input">{{ t('common.typeToConfirm', { text: typeToConfirm }) }}</Label>
        <Input id="confirm-input" v-model="typed" autocomplete="off" data-testid="confirm-input" />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button
          :variant="destructive ? 'destructive' : 'default'"
          :disabled="!canConfirm"
          data-testid="confirm-button"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? t('common.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
