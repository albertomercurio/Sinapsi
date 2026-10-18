<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { KeyRound, ShieldAlert, ShieldCheck, ShieldOff, Trash2, UserPlus } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { NativeSelect } from '@/shared/ui/select'
import { Tooltip } from '@/shared/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { toast } from '@/shared/ui/toast'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { errorKey } from '@/shared/api/errors'
import { useAuthStore } from '@/modules/auth/store'
import {
  useInvite,
  useOrgMembers,
  usePasswordLink,
  useRemoveMember,
  useResetMfa,
  useSetRole,
} from '../api'
import DeliveryChoice from './DeliveryChoice.vue'
import { EMAIL_ENABLED } from '@/shared/api/supabase'
import LinkDialog from './LinkDialog.vue'

const props = defineProps<{ orgId: string; allowOwnerInvite?: boolean }>()
const { t, d, te } = useI18n()
const auth = useAuthStore()
const { data: members } = useOrgMembers(() => props.orgId)
const inviteM = useInvite()
const remove = useRemoveMember()
const setRole = useSetRole()
const pwLink = usePasswordLink()
const mfaReset = useResetMfa()

const email = ref('')
const role = ref<'owner' | 'therapist'>('therapist')
const delivery = ref<'link' | 'email'>('link')

const linkOpen = ref(false)
const linkValue = ref<string | null>(null)
const linkKind = ref<'invite' | 'recovery'>('invite')
const linkEmail = ref('')

type Target = { userId: string; email: string }
const toRemove = ref<Target | null>(null)
const removeOpen = ref(false)
const toResetMfa = ref<Target | null>(null)
const mfaOpen = ref(false)

const roleOptions = [
  { value: 'therapist' as const, label: t('common.roles.therapist') },
  { value: 'owner' as const, label: t('common.roles.owner') },
]

/** Owners manage therapists of their own practice; platform admins manage everyone except themselves. */
function canManage(m: { user_id: string; role: string }) {
  if (m.user_id === auth.context?.user_id) return false
  return auth.isPlatformAdmin || m.role === 'therapist'
}
const isAdminView = computed(() => auth.isPlatformAdmin)

function fail(e: unknown) {
  const code = (e as { code?: string }).code ?? ''
  toast.error(te(`admin.errors.${code}`) ? t(`admin.errors.${code}`) : t(errorKey(e)))
}

function showLink(link: string, kind: 'invite' | 'recovery', to: string) {
  linkValue.value = link
  linkKind.value = kind
  linkEmail.value = to
  linkOpen.value = true
}

async function send() {
  const to = email.value.trim()
  try {
    const res = await inviteM.mutateAsync({
      email: to,
      orgId: props.orgId,
      role: props.allowOwnerInvite ? role.value : 'therapist',
      delivery: delivery.value,
    })
    if (res.link) showLink(res.link, 'invite', to)
    else toast.success(res.existing ? t('admin.memberAdded') : t('admin.invited', { email: to }))
    email.value = ''
  } catch (e) {
    fail(e)
  }
}

async function makePasswordLink(m: Target) {
  try {
    const res = await pwLink.mutateAsync(m.userId)
    if (res.link) showLink(res.link, 'recovery', m.email)
  } catch (e) {
    fail(e)
  }
}

async function confirmResetMfa() {
  if (!toResetMfa.value) return
  try {
    const res = await mfaReset.mutateAsync(toResetMfa.value.userId)
    toast.success(t('admin.mfaResetDone', { n: res.removed ?? 0 }))
    mfaOpen.value = false
  } catch (e) {
    fail(e)
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
        <TableRow
          v-for="m in members ?? []"
          :key="m.user_id"
          data-testid="member-row"
          :data-email="m.email"
        >
          <TableCell>
            <p class="font-medium">{{ m.display_name || m.email }}</p>
            <p v-if="m.display_name" class="text-muted-foreground text-xs">{{ m.email }}</p>
          </TableCell>
          <TableCell>
            <NativeSelect
              v-if="m.user_id !== auth.context?.user_id && isAdminView"
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
          <TableCell class="text-right whitespace-nowrap">
            <template v-if="canManage(m)">
              <Tooltip :text="t('admin.passwordLink')">
                <Button
                  variant="ghost"
                  size="icon"
                  :aria-label="t('admin.passwordLink')"
                  data-testid="password-link"
                  @click="makePasswordLink({ userId: m.user_id, email: m.email })"
                >
                  <KeyRound />
                </Button>
              </Tooltip>
              <Tooltip :text="t('admin.resetMfa')">
                <Button
                  variant="ghost"
                  size="icon"
                  :disabled="!m.mfa_enrolled"
                  :aria-label="t('admin.resetMfa')"
                  data-testid="reset-mfa"
                  @click="((toResetMfa = { userId: m.user_id, email: m.email }), (mfaOpen = true))"
                >
                  <ShieldOff />
                </Button>
              </Tooltip>
              <Tooltip :text="t('common.remove')">
                <Button
                  variant="ghost"
                  size="icon"
                  :aria-label="t('common.remove')"
                  @click="((toRemove = { userId: m.user_id, email: m.email }), (removeOpen = true))"
                >
                  <Trash2 />
                </Button>
              </Tooltip>
            </template>
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
        :aria-label="t('auth.email')"
        data-testid="invite-email"
      />
      <NativeSelect
        v-if="allowOwnerInvite"
        v-model="role"
        :options="roleOptions"
        class="w-36"
        :aria-label="t('admin.role')"
      />
      <DeliveryChoice v-if="EMAIL_ENABLED" v-model="delivery" />
      <Button type="submit" :disabled="inviteM.isPending.value" data-testid="invite-submit"
        ><UserPlus /> {{ t('admin.invite') }}</Button
      >
    </form>
    <p class="text-muted-foreground text-xs">
      {{ delivery === 'link' ? t('admin.delivery.linkHelp') : t('admin.delivery.emailHelp') }}
    </p>

    <LinkDialog v-model:open="linkOpen" :link="linkValue" :kind="linkKind" :email="linkEmail" />
    <ConfirmDialog
      v-model:open="mfaOpen"
      :title="t('admin.resetMfaTitle', { email: toResetMfa?.email ?? '' })"
      :description="t('admin.resetMfaText')"
      :confirm-label="t('admin.resetMfa')"
      destructive
      @confirm="confirmResetMfa"
    />
    <ConfirmDialog
      v-model:open="removeOpen"
      :title="t('admin.removeTitle', { email: toRemove?.email ?? '' })"
      :description="t('admin.removeText')"
      destructive
      @confirm="confirmRemove"
    />
  </div>
</template>
