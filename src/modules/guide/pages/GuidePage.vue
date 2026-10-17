<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Lightbulb, Search } from '@lucide/vue'
import { Input } from '@/shared/ui/input'
import PageHeader from '@/shared/components/PageHeader.vue'
import { loadGuide, REFERENCES, type GuideBlock, type GuideContent } from '../content'
import ReferenceItem from '../components/ReferenceItem.vue'

const { t, locale } = useI18n()
const route = useRoute()
const content = shallowRef<GuideContent | null>(null)
const query = ref('')
let scrolled = false

watch(
  locale,
  async (l) => {
    content.value = await loadGuide(l)
    if (scrolled) return
    scrolled = true
    await nextTick()
    scrollToHash()
  },
  { immediate: true },
)

/** The router scrolls to #anchors itself once the page exists; this covers the first load. */
function scrollToHash() {
  const el = route.hash ? document.getElementById(decodeURIComponent(route.hash.slice(1))) : null
  if (!el) return
  el.scrollIntoView() // honours scroll-margin (clears the sticky mobile header)
  el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
}

function blockText(b: GuideBlock): string {
  if ('p' in b) return b.p
  if ('h' in b) return b.h
  if ('example' in b) return b.example
  if ('list' in b) return b.list.join(' ')
  return b.terms.map((x) => `${x.term} ${x.def}`).join(' ')
}
const normalize = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const sections = computed(() => {
  const all = content.value?.sections ?? []
  const q = normalize(query.value.trim())
  if (!q) return all
  return all.filter((s) => normalize([s.title, ...s.blocks.map(blockText)].join(' ')).includes(q))
})
const bibliography = computed(() =>
  Object.keys(REFERENCES).sort((a, b) => REFERENCES[a]!.text.localeCompare(REFERENCES[b]!.text)),
)
</script>

<template>
  <div>
    <PageHeader :title="t('guide.title')" :description="t('guide.subtitle')" />
    <div v-if="content" class="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside class="lg:sticky lg:top-8 lg:self-start">
        <div class="relative mb-4">
          <Search
            class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            v-model="query"
            type="search"
            class="pl-8"
            :placeholder="t('guide.searchPlaceholder')"
            :aria-label="t('guide.search')"
          />
        </div>
        <nav :aria-label="t('guide.contents')">
          <h2 class="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            {{ t('guide.contents') }}
          </h2>
          <ol class="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:grid lg:gap-1">
            <li v-for="s in sections" :key="s.id">
              <RouterLink
                :to="{ hash: `#${s.id}` }"
                class="text-foreground/80 hover:text-foreground hover:underline"
                >{{ s.title }}</RouterLink
              >
            </li>
            <li v-if="!query">
              <RouterLink
                :to="{ hash: '#bibliography' }"
                class="text-foreground/80 hover:text-foreground hover:underline"
                >{{ t('guide.bibliography') }}</RouterLink
              >
            </li>
          </ol>
        </nav>
      </aside>

      <div class="grid min-w-0 gap-6">
        <p v-if="!query" class="max-w-prose text-sm leading-relaxed">{{ content.intro }}</p>
        <p v-if="!sections.length" class="text-muted-foreground text-sm" role="status">
          {{ t('guide.noResults', { q: query }) }}
        </p>

        <section
          v-for="s in sections"
          :id="s.id"
          :key="s.id"
          class="bg-card scroll-mt-18 rounded-xl border p-5 shadow-xs sm:p-6"
          :aria-labelledby="`${s.id}-title`"
        >
          <h2 :id="`${s.id}-title`" tabindex="-1" class="text-lg font-semibold outline-none">
            {{ s.title }}
          </h2>
          <div class="mt-3 grid max-w-prose gap-3 text-sm leading-relaxed">
            <template v-for="(b, i) in s.blocks" :key="i">
              <p v-if="'p' in b">{{ b.p }}</p>
              <h3 v-else-if="'h' in b" class="mt-2 font-semibold">{{ b.h }}</h3>
              <ul v-else-if="'list' in b" class="grid list-disc gap-1 pl-5">
                <li v-for="(x, j) in b.list" :key="j">{{ x }}</li>
              </ul>
              <dl v-else-if="'terms' in b" class="grid gap-3">
                <div v-for="x in b.terms" :key="x.term">
                  <dt class="font-medium">{{ x.term }}</dt>
                  <dd class="text-muted-foreground mt-0.5">{{ x.def }}</dd>
                </div>
              </dl>
              <p v-else class="bg-muted/60 flex gap-2 rounded-lg p-3">
                <Lightbulb class="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{{ b.example }}</span>
              </p>
            </template>
          </div>
          <div v-if="s.refs?.length" class="mt-5 border-t pt-3">
            <h3 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {{ t('guide.references') }}
            </h3>
            <ul class="mt-2 grid gap-1.5 text-xs leading-relaxed">
              <li v-for="r in s.refs" :key="r"><ReferenceItem :id="r" /></li>
            </ul>
          </div>
        </section>

        <section
          v-if="!query"
          id="bibliography"
          class="bg-card scroll-mt-18 rounded-xl border p-5 shadow-xs sm:p-6"
          aria-labelledby="bibliography-title"
        >
          <h2 id="bibliography-title" tabindex="-1" class="text-lg font-semibold outline-none">
            {{ t('guide.bibliography') }}
          </h2>
          <p class="text-muted-foreground mt-1 text-sm">{{ t('guide.bibliographyIntro') }}</p>
          <ul class="mt-3 grid gap-2 text-xs leading-relaxed">
            <li v-for="r in bibliography" :key="r"><ReferenceItem :id="r" /></li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
