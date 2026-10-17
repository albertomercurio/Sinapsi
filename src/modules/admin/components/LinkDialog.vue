<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Copy, MessageCircle, Share2 } from '@lucide/vue'
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

/** Shows a one-time account link the admin delivers personally (WhatsApp, Signal, in person…). */
const props = defineProps<{ link: string | null; kind: 'invite' | 'recovery'; email?: string }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const message = computed(() =>
  t(props.kind === 'invite' ? 'admin.link.inviteMessage' : 'admin.link.recoveryMessage', {
    link: props.link ?? '',
  }),
)
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const whatsapp = computed(() => `https://wa.me/?text=${encodeURIComponent(message.value)}`)

async function copy() {
  if (!props.link) return
  await navigator.clipboard.writeText(props.link)
  toast.success(t('admin.link.copied'))
}

async function share() {
  try {
    await navigator.share({ text: message.value })
  } catch {
    // dismissed
  }
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
        <Button variant="outline" :aria-label="t('admin.link.copy')" @click="copy"><Copy /></Button>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as="a" :href="whatsapp" target="_blank" rel="noopener noreferrer" variant="outline"
          ><MessageCircle /> WhatsApp</Button
        >
        <Button v-if="canShare" variant="outline" @click="share"
          ><Share2 /> {{ t('admin.link.share') }}</Button
        >
      </div>
      <Alert variant="warning"
        ><AlertDescription>{{ t('admin.link.warning') }}</AlertDescription></Alert
      >
    </DialogContent>
  </Dialog>
</template>
