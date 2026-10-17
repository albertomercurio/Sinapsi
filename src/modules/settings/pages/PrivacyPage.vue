<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatabaseBackup, Loader2, Upload } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Progress } from '@/shared/ui/progress'
import { toast } from '@/shared/ui/toast'
import { supabase } from '@/shared/api/supabase'
import { errorKey } from '@/shared/api/errors'
import { downloadBlob } from '@/shared/lib/download'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/modules/auth/store'
import {
  BackupError,
  collectOrgData,
  decryptBackup,
  encryptBackup,
  lastBackupAt,
  markBackup,
  restoreBackup,
} from '../backup'

const { t, d } = useI18n()
const auth = useAuthStore()
const qc = useQueryClient()
const pass = ref('')
const pass2 = ref('')
const busy = ref(false)
const step = ref('')
const last = ref(auth.currentOrgId ? lastBackupAt(auth.currentOrgId) : null)

const restoreFile = ref<File | null>(null)
const restorePass = ref('')
const restoreProgress = ref<number | null>(null)

const strongEnough = computed(() => pass.value.length >= 12 && pass.value === pass2.value)

async function exportBackup() {
  const m = auth.currentMembership
  if (!m) return
  busy.value = true
  try {
    const doc = await collectOrgData(
      { id: m.org_id, name: m.org_name },
      (tbl) => (step.value = tbl),
    )
    step.value = 'encrypt'
    const bytes = await encryptBackup(doc, pass.value)
    downloadBlob(
      new Blob([bytes as BlobPart], { type: 'application/octet-stream' }),
      `sinapsi-backup-${new Date().toISOString().slice(0, 10)}.sinapsi`,
    )
    await supabase.rpc('log_event', {
      p_org: m.org_id,
      p_action: 'backup_export',
      p_entity: 'organizations',
      p_entity_id: m.org_id,
      p_details: { patients: doc.tables.patients.length, runs: doc.tables.activity_runs.length },
    })
    markBackup(m.org_id)
    last.value = new Date()
    pass.value = ''
    pass2.value = ''
    toast.success(t('settings.backup.done'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  } finally {
    busy.value = false
    step.value = ''
  }
}

function onFile(e: Event) {
  restoreFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function restore() {
  if (!restoreFile.value || !auth.currentOrgId) return
  restoreProgress.value = 0
  try {
    const doc = await decryptBackup(
      new Uint8Array(await restoreFile.value.arrayBuffer()),
      restorePass.value,
    )
    const res = await restoreBackup(
      doc,
      auth.currentOrgId,
      (done, total) => (restoreProgress.value = total ? Math.round((done / total) * 100) : 100),
    )
    toast.success(t('settings.backup.restored', { n: res.inserted }))
    void qc.invalidateQueries()
  } catch (e) {
    toast.error(e instanceof BackupError ? t(`settings.backup.error.${e.code}`) : t(errorKey(e)))
  } finally {
    restoreProgress.value = null
    restorePass.value = ''
  }
}
</script>

<template>
  <div class="grid max-w-3xl gap-4">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"
          ><DatabaseBackup class="size-5" /> {{ t('settings.backup.title') }}</CardTitle
        >
        <CardDescription>{{ t('settings.backup.help') }}</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4">
        <p class="text-sm">
          {{
            last
              ? t('settings.backup.last', { date: d(last, 'dateTime') })
              : t('settings.backup.never')
          }}
        </p>
        <Alert variant="warning"
          ><AlertDescription>{{ t('settings.backup.passphraseWarning') }}</AlertDescription></Alert
        >
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="grid gap-2">
            <Label for="bp1">{{ t('settings.backup.passphrase') }}</Label
            ><Input
              id="bp1"
              v-model="pass"
              type="password"
              autocomplete="new-password"
              data-testid="backup-pass"
            />
          </div>
          <div class="grid gap-2">
            <Label for="bp2">{{ t('settings.backup.passphraseRepeat') }}</Label
            ><Input
              id="bp2"
              v-model="pass2"
              type="password"
              autocomplete="new-password"
              data-testid="backup-pass2"
            />
          </div>
        </div>
        <p class="text-muted-foreground text-xs">{{ t('settings.backup.passphraseRule') }}</p>
        <Button
          class="w-fit"
          :disabled="!strongEnough || busy"
          data-testid="backup-export"
          @click="exportBackup"
        >
          <Loader2 v-if="busy" class="animate-spin" /><DatabaseBackup v-else />
          {{ busy ? t('settings.backup.working', { step }) : t('settings.backup.export') }}
        </Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"
          ><Upload class="size-5" /> {{ t('settings.backup.restoreTitle') }}</CardTitle
        >
        <CardDescription>{{ t('settings.backup.restoreHelp') }}</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3">
        <Input
          type="file"
          accept=".sinapsi,application/octet-stream"
          data-testid="restore-file"
          @change="onFile"
        />
        <div class="grid gap-2">
          <Label for="rp">{{ t('settings.backup.passphrase') }}</Label
          ><Input
            id="rp"
            v-model="restorePass"
            type="password"
            autocomplete="off"
            data-testid="restore-pass"
          />
        </div>
        <Progress v-if="restoreProgress !== null" :model-value="restoreProgress" />
        <Button
          variant="outline"
          class="w-fit"
          :disabled="!restoreFile || !restorePass || restoreProgress !== null"
          data-testid="restore-submit"
          @click="restore"
        >
          {{ t('settings.backup.restore') }}
        </Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader
        ><CardTitle>{{ t('settings.dataTitle') }}</CardTitle></CardHeader
      >
      <CardContent class="text-muted-foreground grid gap-2 text-sm leading-relaxed">
        <p>{{ t('settings.dataStored') }}</p>
        <p>{{ t('settings.dataWhere') }}</p>
        <p>
          {{
            t('settings.dataRetention', { n: auth.currentMembership?.raw_retention_months ?? 24 })
          }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>
