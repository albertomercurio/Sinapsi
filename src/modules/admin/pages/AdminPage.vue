<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Building2, HardDrive, Plus, Users } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toast } from '@/shared/ui/toast'
import PageHeader from '@/shared/components/PageHeader.vue'
import { errorKey } from '@/shared/api/errors'
import { useAdminOverview, useAdminStorage, useInvite } from '../api'
import MembersTable from '../components/MembersTable.vue'
import DeliveryChoice from '../components/DeliveryChoice.vue'
import { EMAIL_ENABLED } from '@/shared/api/supabase'
import LinkDialog from '../components/LinkDialog.vue'

const { t, n, d, te } = useI18n()
const { data: orgs } = useAdminOverview()
const { data: storage } = useAdminStorage()
const inviteM = useInvite()

const FREE_LIMIT = 500 * 1024 * 1024
const usedPct = computed(() =>
  storage.value ? Math.min(100, (storage.value.database_bytes / FREE_LIMIT) * 100) : 0,
)
const mb = (b: number) => `${n(b / 1024 / 1024, 'decimal1')} MB`

const createOpen = ref(false)
const newOrg = ref({ name: '', email: '' })
const delivery = ref<'link' | 'email'>('link')
const createdLink = ref<string | null>(null)
const createdEmail = ref('')
const linkOpen = ref(false)
const manageOrg = ref<{ id: string; name: string } | null>(null)
const manageOpen = ref(false)

async function createOrg() {
  try {
    const res = await inviteM.mutateAsync({
      email: newOrg.value.email.trim(),
      newOrgName: newOrg.value.name.trim(),
      role: 'owner',
      delivery: delivery.value,
    })
    toast.success(t('admin.orgCreated', { name: newOrg.value.name }))
    createOpen.value = false
    if (res.link) {
      createdLink.value = res.link
      createdEmail.value = newOrg.value.email.trim()
      linkOpen.value = true
    }
    newOrg.value = { name: '', email: '' }
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    toast.error(te(`admin.errors.${code}`) ? t(`admin.errors.${code}`) : t(errorKey(e)))
  }
}
</script>

<template>
  <div class="grid gap-6">
    <PageHeader :title="t('admin.title')" :description="t('admin.subtitle')">
      <template #actions>
        <Button data-testid="new-org" @click="createOpen = true"
          ><Plus /> {{ t('admin.newOrg') }}</Button
        >
      </template>
    </PageHeader>

    <Alert variant="info"
      ><AlertDescription>{{ t('admin.noClinicalAccess') }}</AlertDescription></Alert
    >

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"
          ><HardDrive class="size-5" /> {{ t('admin.storageTitle') }}</CardTitle
        >
        <CardDescription>{{ t('admin.storageHelp') }}</CardDescription>
      </CardHeader>
      <CardContent v-if="storage" class="grid gap-2">
        <Progress :model-value="usedPct" />
        <p class="text-sm tabular-nums">
          {{
            t('admin.storageUsed', {
              used: mb(storage.database_bytes),
              limit: '500 MB',
              pct: n(usedPct / 100, 'percent'),
            })
          }}
        </p>
        <p class="text-muted-foreground text-xs">
          {{ t('admin.storageRaw', { raw: mb(storage.raw_event_bytes), runs: storage.runs }) }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader
        ><CardTitle class="flex items-center gap-2"
          ><Building2 class="size-5" /> {{ t('admin.orgsTitle') }}</CardTitle
        ></CardHeader
      >
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ t('admin.org') }}</TableHead>
              <TableHead class="text-right">{{ t('admin.members') }}</TableHead>
              <TableHead class="text-right">{{ t('admin.patients') }}</TableHead>
              <TableHead class="text-right">{{ t('admin.runs') }}</TableHead>
              <TableHead class="hidden text-right md:table-cell">{{
                t('admin.rawSize')
              }}</TableHead>
              <TableHead class="hidden md:table-cell">{{ t('admin.lastActivity') }}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="o in orgs ?? []" :key="o.org_id">
              <TableCell class="font-medium">{{ o.name }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ o.members }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ o.patients }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ o.runs }}</TableCell>
              <TableCell class="hidden text-right tabular-nums md:table-cell">{{
                mb(o.raw_event_bytes)
              }}</TableCell>
              <TableCell class="hidden md:table-cell">{{
                o.last_run_at ? d(new Date(o.last_run_at), 'medium') : '—'
              }}</TableCell>
              <TableCell class="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  @click="((manageOrg = { id: o.org_id, name: o.name }), (manageOpen = true))"
                  ><Users /> {{ t('admin.manage') }}</Button
                >
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog v-model:open="createOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('admin.newOrg') }}</DialogTitle>
          <DialogDescription>{{ t('admin.newOrgHelp') }}</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4" @submit.prevent="createOrg">
          <div class="grid gap-2">
            <Label for="org-n">{{ t('admin.orgName') }}</Label
            ><Input
              id="org-n"
              v-model="newOrg.name"
              required
              maxlength="120"
              data-testid="new-org-name"
            />
          </div>
          <div class="grid gap-2">
            <Label for="org-e">{{ t('admin.ownerEmail') }}</Label
            ><Input
              id="org-e"
              v-model="newOrg.email"
              type="email"
              required
              data-testid="new-org-email"
            />
          </div>
          <div class="grid gap-2">
            <DeliveryChoice v-if="EMAIL_ENABLED" v-model="delivery" />
            <p class="text-muted-foreground text-xs">
              {{
                delivery === 'link' ? t('admin.delivery.linkHelp') : t('admin.delivery.emailHelp')
              }}
            </p>
          </div>
          <Alert variant="warning"
            ><AlertDescription>{{ t('admin.dpaReminder') }}</AlertDescription></Alert
          >
          <DialogFooter
            ><Button
              type="submit"
              :disabled="inviteM.isPending.value"
              data-testid="new-org-submit"
              >{{ t('admin.createAndInvite') }}</Button
            ></DialogFooter
          >
        </form>
      </DialogContent>
    </Dialog>

    <LinkDialog v-model:open="linkOpen" :link="createdLink" kind="invite" :email="createdEmail" />

    <Dialog v-model:open="manageOpen">
      <DialogContent class="sm:max-w-3xl">
        <DialogHeader
          ><DialogTitle>{{ manageOrg?.name }}</DialogTitle
          ><DialogDescription>{{ t('admin.manageHelp') }}</DialogDescription></DialogHeader
        >
        <MembersTable v-if="manageOrg" :org-id="manageOrg.id" allow-owner-invite />
      </DialogContent>
    </Dialog>
  </div>
</template>
