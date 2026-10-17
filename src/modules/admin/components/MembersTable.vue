<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ShieldCheck, ShieldAlert, Trash2, UserPlus } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { NativeSelect } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { errorKey } from '@/shared/api/errors'
import { useAuthStore } from '@/modules/auth/store'
import { useInvite, useOrgMembers, useRemoveMember, useSetRole } from '../api'

const props = defineProps<{ orgId: string; allowOwnerInvite?: boolean }>()
const { t, d, te } = useI18n()
const auth = useAuthStore()
const { data: members } = useOrgMembers(() => props.orgId)
const inviteM = useInvite()
const remove = useRemoveMember()
const setRole = useSetRole()
const email = ref('')
const role = ref<'owner' | 'therapist'>('therapist')
const toRemove = ref<{ userId: string; email: string } | null>(null)
const removeOpen = ref(false)

const roleOptions = [
  { value: 'therapist' as const, label: t('common.roles.therapist') },
  { value: 'owner' as const, label: t('common.roles.owner') },
]

async function send() {
  try {
    const res = await inviteM.mutateAsync({
      email: email.value.trim(),
      orgId: props.orgId,
      role: props.allowOwnerInvite ? role.value : 'therapist',
    })
    toast.success(
      res.existing ? t('admin.memberAdded') : t('admin.invited', { email: email.value }),
    )
    email.value = ''
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    toast.error(te(`admin.errors.${code}`) ? t(`admin.errors.${code}`) : t(errorKey(e)))
  }
}

async function confirmRemove() {
  if (!toRemove.value) return
  try {
    await remove.mutateAsync({ orgId: props.orgId, userId: toRemove.value.userId })
    removeOpen.value = false
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div class="grid gap-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{{ t('admin.member') }}</TableHead>
          <TableHead>{{ t('admin.role') }}</TableHead>
          <TableHead>{{ t('admin.twoFactor') }}</TableHead>
          <TableHead class="hidden md:table-cell">{{ t('admin.lastSignIn') }}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="m in members ?? []" :key="m.user_id">
          <TableCell>
            <p class="font-medium">{{ m.display_name || m.email }}</p>
            <p v-if="m.display_name" class="text-muted-foreground text-xs">{{ m.email }}</p>
          </TableCell>
          <TableCell>
            <NativeSelect
              v-if="m.user_id !== auth.context?.user_id"
              :aria-label="t('admin.role')"
              :model-value="m.role"
              :options="roleOptions"
              class="w-36"
              @update:model-value="
                setRole.mutate({ orgId, userId: m.user_id, role: $event as 'owner' | 'therapist' })
              "
            />
            <Badge v-else variant="secondary">{{ t(`common.roles.${m.role}`) }}</Badge>
          </TableCell>
          <TableCell>
            <span
              v-if="m.mfa_enrolled"
              class="text-success-strong inline-flex items-center gap-1 text-xs"
              ><ShieldCheck class="size-4" /> {{ t('admin.mfaOn') }}</span
            >
            <span
              v-else
              class="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"
              ><ShieldAlert class="size-4" /> {{ t('admin.mfaPending') }}</span
            >
          </TableCell>
          <TableCell class="hidden md:table-cell">{{
            m.last_sign_in_at ? d(new Date(m.last_sign_in_at), 'dateTime') : '—'
          }}</TableCell>
          <TableCell class="text-right">
            <Button
              v-if="m.user_id !== auth.context?.user_id"
              variant="ghost"
              size="icon"
              :aria-label="t('common.remove')"
              @click="((toRemove = { userId: m.user_id, email: m.email }), (removeOpen = true))"
            >
              <Trash2 />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <form class="flex flex-wrap items-center gap-2" @submit.prevent="send">
      <Input
        v-model="email"
        type="email"
        required
        class="max-w-72"
        :placeholder="t('admin.emailPlaceholder')"
        data-testid="invite-email"
      />
      <NativeSelect
        v-if="allowOwnerInvite"
        v-model="role"
        :options="roleOptions"
        class="w-36"
        :aria-label="t('admin.role')"
      />
      <Button type="submit" :disabled="inviteM.isPending.value" data-testid="invite-submit"
        ><UserPlus /> {{ t('admin.invite') }}</Button
      >
    </form>
    <ConfirmDialog
      v-model:open="removeOpen"
      :title="t('admin.removeTitle', { email: toRemove?.email ?? '' })"
      :description="t('admin.removeText')"
      destructive
      @confirm="confirmRemove"
    />
  </div>
</template>
