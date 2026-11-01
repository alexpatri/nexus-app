import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, NETWORK_ERROR } from '@/core/api/client'
import { createAutosave } from './autosave'

describe('createAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('espera a pausa e grava só o último estado, com a revisão', async () => {
    const put = vi.fn<(data: unknown, revision: number) => Promise<number>>(async (_, r) => r + 1)
    const a = createAutosave({ revision: 3, put, delay: 100 })

    a.schedule({ n: 1 })
    a.schedule({ n: 2 })
    expect(a.state.status).toBe('pending')
    await vi.advanceTimersByTimeAsync(100)

    expect(put).toHaveBeenCalledOnce()
    expect(put).toHaveBeenCalledWith({ n: 2 }, 3)
    expect(a.state).toMatchObject({ status: 'saved', revision: 4 })
  })

  it('o que muda durante uma gravação sai na seguinte, com a revisão nova', async () => {
    let finish!: (r: number) => void
    const put = vi
      .fn<(data: unknown, revision: number) => Promise<number>>()
      .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
      .mockImplementation(async (_, r) => r + 1)
    const a = createAutosave({ revision: 1, put, delay: 100 })

    a.schedule({ n: 1 })
    await vi.advanceTimersByTimeAsync(100)
    a.schedule({ n: 2 })
    await vi.advanceTimersByTimeAsync(100)
    expect(put).toHaveBeenCalledTimes(1)

    finish(2)
    await vi.advanceTimersByTimeAsync(0)
    expect(put).toHaveBeenLastCalledWith({ n: 2 }, 2)
    expect(a.state).toMatchObject({ status: 'saved', revision: 3 })
  })

  it('sem conexão, tenta de novo sozinho', async () => {
    const put = vi
      .fn<(data: unknown, revision: number) => Promise<number>>()
      .mockRejectedValueOnce(new ApiError(0, NETWORK_ERROR))
      .mockResolvedValue(2)
    const a = createAutosave({ revision: 1, put, delay: 100, retry: 1000 })

    a.schedule({ n: 1 })
    await vi.advanceTimersByTimeAsync(100)
    expect(a.state.status).toBe('offline')

    await vi.advanceTimersByTimeAsync(1000)
    expect(put).toHaveBeenCalledTimes(2)
    expect(a.state.status).toBe('saved')
  })

  it('para no conflito: outra escrita venceu e nada mais é gravado', async () => {
    const put = vi
      .fn<(data: unknown, revision: number) => Promise<number>>()
      .mockRejectedValue(new ApiError(409, 'sheet.conflict'))
    const a = createAutosave({ revision: 1, put, delay: 100 })

    a.schedule({ n: 1 })
    await vi.advanceTimersByTimeAsync(100)
    a.schedule({ n: 2 })
    await vi.advanceTimersByTimeAsync(1000)

    expect(put).toHaveBeenCalledOnce()
    expect(a.state.status).toBe('conflict')
  })

  it('flush grava na hora, sem esperar a pausa', async () => {
    const put = vi.fn<(data: unknown, revision: number) => Promise<number>>(async () => 2)
    const a = createAutosave({ revision: 1, put, delay: 10_000 })
    a.schedule({ n: 1 })
    await a.flush()
    expect(put).toHaveBeenCalledOnce()
  })
})
