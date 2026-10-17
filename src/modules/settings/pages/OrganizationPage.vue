<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { toast } from '@/shared/ui/toast'
import { supabase } from '@/shared/api/supabase'
import { errorKey, unwrap } from '@/shared/api/errors'
import { useAuthStore } from '@/modules/auth/store'
import MembersTable from '@/modules/admin/components/MembersTable.vue'
import NamesKeyCard from '@/modules/patients/names/NamesKeyCard.vue'

const { t } = useI18n()
const auth = useAuthStore()
const form = ref({
  name: '',
  patient_code_prefix: 'PZ',
  idle_timeout_min: 15,
  raw_retention_months: 24,
})

watch(
  () => auth.currentMembership,
  (m) => {
    if (m)
      form.value = {
        name: m.org_name,
        patient_code_prefix: m.patient_code_prefix,
        idle_timeout_min: m.idle_timeout_min,
        raw_retention_months: m.raw_retention_months,
      }
  },
  { immediate: true },
)

async function save() {
  try {
    unwrap(
      await supabase
        .from('organizations')
        .update({
          name: form.value.name.trim(),
          patient_code_prefix: form.value.patient_code_prefix.trim().toUpperCase(),
          idle_timeout_min: Number(form.value.idle_timeout_min),
          raw_retention_months: Number(form.value.raw_retention_months),
        })
        .eq('id', auth.currentOrgId!),
    )
    await auth.loadContext()
    toast.success(t('common.saved'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}
</script>

<template>
  <div class="grid max-w-4xl gap-4">
    <Card>
      <CardHeader
        ><CardTitle>{{ t('settings.orgTitle') }}</CardTitle></CardHeader
      >
      <CardContent class="grid gap-4 sm:grid-cols-2">
        <div class="grid gap-2 sm:col-span-2">
          <Label for="org-name">{{ t('settings.orgName') }}</Label
          ><Input id="org-name" v-model="form.name" maxlength="120" />
        </div>
        <div class="grid gap-2">
          <Label for="prefix">{{ t('settings.codePrefix') }}</Label>
          <Input
            id="prefix"
            v-model="form.patient_code_prefix"
            maxlength="4"
            class="font-mono uppercase"
          />
          <p class="text-muted-foreground text-xs">{{ t('settings.codePrefixHelp') }}</p>
        </div>
        <div class="grid gap-2">
          <Label for="idle">{{ t('settings.idleTimeout') }}</Label>
          <Input id="idle" v-model.number="form.idle_timeout_min" type="number" min="5" max="120" />
          <p class="text-muted-foreground text-xs">{{ t('settings.idleTimeoutHelp') }}</p>
        </div>
        <div class="grid gap-2">
          <Label for="retention">{{ t('settings.retention') }}</Label>
          <Input
            id="retention"
            v-model.number="form.raw_retention_months"
            type="number"
            min="1"
            max="120"
          />
          <p class="text-muted-foreground text-xs">{{ t('settings.retentionHelp') }}</p>
        </div>
        <div class="sm:col-span-2">
          <Button @click="save">{{ t('common.save') }}</Button>
        </div>
      </CardContent>
    </Card>
    <NamesKeyCard />
    <Card>
      <CardHeader>
        <CardTitle>{{ t('settings.membersTitle') }}</CardTitle>
        <CardDescription>{{ t('settings.membersHelp') }}</CardDescription>
      </CardHeader>
      <CardContent
        ><MembersTable v-if="auth.currentOrgId" :org-id="auth.currentOrgId"
      /></CardContent>
    </Card>
  </div>
</template>
