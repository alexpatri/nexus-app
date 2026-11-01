import { reactive } from 'vue'

import { ApiError, NETWORK_ERROR } from '@/core/api/client'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'offline' | 'conflict' | 'error'

export interface AutosaveOptions {
  revision: number
  // Grava e devolve a revisão nova.
  put: (data: unknown, revision: number) => Promise<number>
  delay?: number
  retry?: number
}

// Salva o estado inteiro depois de uma pausa na digitação. Uma escrita por vez:
// o que mudar durante uma gravação sai na seguinte, com a revisão nova.
export function createAutosave(opts: AutosaveOptions) {
  const delay = opts.delay ?? 800
  const retry = opts.retry ?? 5000
  const state = reactive({ status: 'saved' as SaveStatus, revision: opts.revision })
  let latest: unknown
  let dirty = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let inFlight: Promise<void> | undefined

  function schedule(data: unknown, wait = delay) {
    latest = data
    dirty = true
    if (state.status === 'conflict') return
    if (state.status !== 'offline') state.status = 'pending'
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), wait)
  }

  async function flush(): Promise<void> {
    clearTimeout(timer)
    if (inFlight) {
      await inFlight
      return dirty ? flush() : undefined
    }
    if (!dirty || state.status === 'conflict') return
    dirty = false
    const data = latest
    state.status = 'saving'
    inFlight = opts
      .put(data, state.revision)
      .then((revision) => {
        state.revision = revision
        state.status = dirty ? 'pending' : 'saved'
      })
      .catch((err: unknown) => {
        dirty = true
        if (err instanceof ApiError && err.code === NETWORK_ERROR) {
          state.status = 'offline'
          timer = setTimeout(() => void flush(), retry)
        } else if (err instanceof ApiError && err.status === 409) {
          state.status = 'conflict'
        } else {
          state.status = 'error'
        }
      })
      .finally(() => {
        inFlight = undefined
      })
    await inFlight
  }

  return { state, schedule, flush }
}

export type Autosave = ReturnType<typeof createAutosave>
