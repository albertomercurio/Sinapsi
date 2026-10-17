<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Copy } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toast } from '@/shared/ui/toast'

/** Shows a one-time account link for the admin to copy and deliver personally. */
const props = defineProps<{ link: string | null; kind: 'invite' | 'recovery'; email?: string }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

async function copy() {
  if (!props.link) return
  await navigator.clipboard.writeText(props.link)
  toast.success(t('admin.link.copied'))
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{
          kind === 'invite' ? t('admin.link.inviteTitle') : t('admin.link.recoveryTitle')
        }}</DialogTitle>
        <DialogDescription>{{ t('admin.link.help', { email: email ?? '' }) }}</DialogDescription>
      </DialogHeader>
      <div class="flex gap-2">
        <Input
          :model-value="link ?? ''"
          readonly
          class="font-mono text-xs"
          data-testid="account-link"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <Button data-testid="copy-link" @click="copy"><Copy /> {{ t('admin.link.copy') }}</Button>
      </div>
      <Alert variant="warning"
        ><AlertDescription>{{ t('admin.link.warning') }}</AlertDescription></Alert
      >
    </DialogContent>
  </Dialog>
</template>
