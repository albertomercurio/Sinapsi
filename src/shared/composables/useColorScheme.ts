import { ref } from 'vue'

export type ColorScheme = 'system' | 'light' | 'dark'
const KEY = 'sinapsi.color-scheme'
const scheme = ref<ColorScheme>(read())
let media: MediaQueryList | null = null

function read(): ColorScheme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function update() {
  const dark = scheme.value === 'dark' || (scheme.value === 'system' && !!media?.matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function applyColorScheme() {
  if (!media) {
    media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', update)
  }
  update()
}

export function useColorScheme() {
  function set(next: ColorScheme) {
    scheme.value = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // ignore
    }
    update()
  }
  return { scheme, set }
}
