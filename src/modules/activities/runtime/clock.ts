import { onScopeDispose, watch, type Ref } from 'vue'

/**
 * A wait() that only counts time while the activity is not paused and that is
 * cancelled when the player unmounts. Players use it for every timed step so
 * pausing freezes the whole exercise.
 */
export function usePausableClock(paused: Ref<boolean>) {
  let disposed = false
  const pending = new Set<() => void>()

  onScopeDispose(() => {
    disposed = true
    for (const cancel of pending) cancel()
    pending.clear()
  })

  /** Pausable delay. `.cancel()` resolves it early (e.g. the patient answered before the deadline). */
  function wait(ms: number): Promise<void> & { cancel: () => void } {
    let cancelEarly: () => void = () => {}
    const promise = new Promise<void>((resolve, reject) => {
      if (disposed) return reject(new CancelledError())
      let remaining = ms
      let last = performance.now()
      let timer: ReturnType<typeof setTimeout> | null = null
      let stopWatch: (() => void) | null = null

      const done = () => {
        cleanup()
        resolve()
      }
      const cancel = () => {
        cleanup()
        reject(new CancelledError())
      }
      const cleanup = () => {
        if (timer) clearTimeout(timer)
        stopWatch?.()
        pending.delete(cancel)
      }
      const schedule = () => {
        last = performance.now()
        timer = setTimeout(done, Math.max(0, remaining))
      }

      cancelEarly = done
      pending.add(cancel)
      stopWatch = watch(paused, (p) => {
        if (p) {
          if (timer) clearTimeout(timer)
          timer = null
          remaining -= performance.now() - last
        } else {
          schedule()
        }
      })
      if (!paused.value) schedule()
    })
    return Object.assign(promise, { cancel: () => cancelEarly() })
  }

  return { wait, isDisposed: () => disposed }
}

export class CancelledError extends Error {
  constructor() {
    super('cancelled')
  }
}

/** Swallows CancelledError (player unmounted mid-sequence). */
export function ignoreCancel(e: unknown) {
  if (!(e instanceof CancelledError)) throw e
}
