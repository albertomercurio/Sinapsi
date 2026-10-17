<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleHelp, ExternalLink } from '@lucide/vue'
import { PopoverArrow, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import type { GuideSectionId } from '@/modules/guide/sections'

/**
 * A small "?" that explains a technical term. Opens on hover with a mouse, on
 * tap/click on touch screens, and from the keyboard (Enter/Space); Esc closes.
 * `guide` = id of the guide section with the long explanation; it opens in a new
 * tab so nothing in progress (session builder, report notes) is lost.
 */
const props = defineProps<{ text: string; label?: string; guide?: GuideSectionId }>()
const { t } = useI18n()
const guideHref = computed(() =>
  props.guide ? `${import.meta.env.BASE_URL}guide#${props.guide}` : null,
)
const open = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function hover(e: PointerEvent, next: boolean) {
  if (e.pointerType !== 'mouse') return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => (open.value = next), next ? 150 : 250)
}
onBeforeUnmount(() => timer && clearTimeout(timer))
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger
      class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-5 shrink-0 items-center justify-center rounded-full align-middle outline-none focus-visible:ring-2"
      :aria-label="
        props.label ? `${t('common.whatIsThis')} ${props.label}` : t('common.whatIsThis')
      "
      data-testid="info-tip"
      @pointerenter="hover($event, true)"
      @pointerleave="hover($event, false)"
      @click.stop
    >
      <CircleHelp class="size-3.5" aria-hidden="true" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        side="top"
        :side-offset="6"
        :collision-padding="12"
        class="bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 z-50 max-w-80 rounded-lg border p-3 text-xs leading-relaxed font-normal shadow-lg"
        @pointerenter="hover($event, true)"
        @pointerleave="hover($event, false)"
      >
        <p>{{ props.text }}</p>
        <a
          v-if="guideHref"
          :href="guideHref"
          target="_blank"
          rel="noopener"
          class="text-primary-strong mt-2 inline-flex items-center gap-1 font-medium hover:underline"
          data-testid="info-tip-guide"
          >{{ t('common.readMoreInGuide') }} <ExternalLink class="size-3" aria-hidden="true"
        /></a>
        <PopoverArrow class="fill-popover" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
