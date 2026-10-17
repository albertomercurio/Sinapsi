<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { NativeSelect } from '@/shared/ui/select'
import { toast } from '@/shared/ui/toast'
import { errorKey } from '@/shared/api/errors'
import { SUPPORTED_LOCALES, setLocale, type LocaleCode } from '@/app/i18n'
import { useColorScheme, type ColorScheme } from '@/shared/composables/useColorScheme'
import { useAuthStore } from '@/modules/auth/store'

const { t, locale } = useI18n()
const auth = useAuthStore()
const { scheme, set: setScheme } = useColorScheme()
const name = ref(auth.context?.profile?.display_name ?? '')
watch(
  () => auth.context?.profile?.display_name,
  (v) => (name.value = v ?? ''),
)

const localeOptions = SUPPORTED_LOCALES.map((l) => ({ value: l.code as string, label: l.label }))
const schemeOptions = [
  { value: 'system' as ColorScheme, label: t('settings.scheme.system') },
  { value: 'light' as ColorScheme, label: t('settings.scheme.light') },
  { value: 'dark' as ColorScheme, label: t('settings.scheme.dark') },
]

async function save() {
  try {
    await auth.updateProfile({
      display_name: name.value.trim() || null,
      ui_locale: String(locale.value),
    })
    toast.success(t('common.saved'))
  } catch (e) {
    toast.error(t(errorKey(e)))
  }
}

async function changeLocale(code: string | undefined) {
  if (!code) return
  await setLocale(code as LocaleCode)
  await auth.updateProfile({ ui_locale: String(code) }).catch(() => undefined)
}
</script>

<template>
  <div class="grid max-w-2xl gap-4">
    <Card>
      <CardHeader>
        <CardTitle>{{ t('settings.profileTitle') }}</CardTitle>
        <CardDescription>{{ auth.context?.email }}</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-2">
          <Label for="display-name">{{ t('settings.displayName') }}</Label>
          <Input id="display-name" v-model="name" maxlength="80" />
          <p class="text-muted-foreground text-xs">{{ t('settings.displayNameHelp') }}</p>
        </div>
        <Button class="w-fit" @click="save">{{ t('common.save') }}</Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader
        ><CardTitle>{{ t('settings.appearance') }}</CardTitle></CardHeader
      >
      <CardContent class="grid gap-4 sm:grid-cols-2">
        <div class="grid gap-2">
          <Label>{{ t('common.language') }}</Label>
          <NativeSelect
            :aria-label="t('common.language')"
            :model-value="String(locale)"
            :options="localeOptions"
            data-testid="profile-language"
            @update:model-value="changeLocale"
          />
        </div>
        <div class="grid gap-2">
          <Label>{{ t('settings.colorScheme') }}</Label>
          <NativeSelect
            :aria-label="t('settings.colorScheme')"
            :model-value="scheme"
            :options="schemeOptions"
            @update:model-value="setScheme($event as ColorScheme)"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
