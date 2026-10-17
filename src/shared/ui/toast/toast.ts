import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info'
export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const items = ref<ToastItem[]>([])
let nextId = 1

export function useToasts() {
  return items
}

/** Minimal in-house toast store (no third-party dependency, works under strict CSP). */
export const toast = {
  show(message: string, kind: ToastKind = 'info', ms = 4000) {
    const id = nextId++
    items.value.push({ id, kind, message })
    setTimeout(() => toast.dismiss(id), ms)
  },
  success: (m: string) => toast.show(m, 'success'),
  error: (m: string) => toast.show(m, 'error', 7000),
  info: (m: string) => toast.show(m, 'info'),
  dismiss(id: number) {
    items.value = items.value.filter((t) => t.id !== id)
  },
}
