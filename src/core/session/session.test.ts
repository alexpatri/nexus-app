import 'fake-indexeddb/auto'
import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const user = { id: '1', name: 'Alex', email: 'alex@exemplo.com' }

describe('session', () => {
  beforeEach(async () => {
    await clear()
    vi.resetModules()
  })

  it('sobrevive a fechar e abrir o app', async () => {
    const first = (await import('./session')).session
    await first.signIn('nxs_abc', user)

    vi.resetModules()
    const reopened = (await import('./session')).session
    await reopened.load()
    expect(reopened.state.token).toBe('nxs_abc')
    expect(reopened.state.user).toEqual(user)
  })

  it('clear apaga o token do aparelho', async () => {
    const { session } = await import('./session')
    await session.signIn('nxs_abc', user)
    await session.clear()

    vi.resetModules()
    const reopened = (await import('./session')).session
    await reopened.load()
    expect(reopened.state.token).toBeUndefined()
  })

  it('updateUser mantém o token', async () => {
    const { session } = await import('./session')
    await session.signIn('nxs_abc', user)
    await session.updateUser({ ...user, name: 'Alexsandro' })
    expect(session.state).toMatchObject({ token: 'nxs_abc', user: { name: 'Alexsandro' } })
  })
})
