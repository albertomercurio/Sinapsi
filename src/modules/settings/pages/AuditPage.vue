<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { supabase } from '@/shared/api/supabase'
import { unwrap } from '@/shared/api/errors'
import type { AuditEntry } from '@/shared/api/types'
import { useAuthStore } from '@/modules/auth/store'
import { useOrgMembers } from '@/modules/admin/api'

const { t, d, te } = useI18n()
const auth = useAuthStore()
const limit = ref(100)
const { data: members } = useOrgMembers(() => auth.currentOrgId)
const { data, isFetching } = useQuery({
  queryKey: computed(() => ['audit', auth.currentOrgId, limit.value]),
  enabled: computed(() => !!auth.currentOrgId),
  queryFn: async () =>
    unwrap(
      await supabase
        .from('audit_log')
        .select('*')
        .eq('org_id', auth.currentOrgId!)
        .order('at', { ascending: false })
        .limit(limit.value),
    ) as AuditEntry[],
})

const who = (id: string | null) =>
  members.value?.find((m) => m.user_id === id)?.email ?? (id ? id.slice(0, 8) : '—')
function detail(e: AuditEntry): string {
  const det = (e.details ?? {}) as { code?: string; changed?: string[] }
  return [det.code, det.changed?.join(', ')].filter(Boolean).join(' · ')
}
const actionLabel = (a: string) =>
  te(`settings.audit.actions.${a}`) ? t(`settings.audit.actions.${a}`) : a
const entityLabel = (e: string) =>
  te(`settings.audit.entities.${e}`) ? t(`settings.audit.entities.${e}`) : e
</script>

<template>
  <div class="grid gap-4">
    <p class="text-muted-foreground max-w-3xl text-sm">{{ t('settings.audit.help') }}</p>
    <div class="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('common.date') }}</TableHead>
            <TableHead>{{ t('settings.audit.who') }}</TableHead>
            <TableHead>{{ t('settings.audit.action') }}</TableHead>
            <TableHead>{{ t('settings.audit.entity') }}</TableHead>
            <TableHead>{{ t('common.details') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="e in data ?? []" :key="e.id">
            <TableCell class="whitespace-nowrap">{{ d(new Date(e.at), 'dateTime') }}</TableCell>
            <TableCell>{{ who(e.actor_id) }}</TableCell>
            <TableCell
              ><Badge variant="outline">{{ actionLabel(e.action) }}</Badge></TableCell
            >
            <TableCell>{{ entityLabel(e.entity) }}</TableCell>
            <TableCell class="font-mono text-xs">{{ detail(e) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <Button
      v-if="(data?.length ?? 0) >= limit"
      variant="outline"
      class="w-fit"
      :disabled="isFetching"
      @click="limit += 200"
      >{{ t('settings.audit.more') }}</Button
    >
  </div>
</template>
