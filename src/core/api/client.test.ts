import { describe, expect, it, vi } from 'vitest'

import { ApiError, createClient, NETWORK_ERROR } from './client'

function reply(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return vi.fn<typeof fetch>(
    async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers }),
  )
}

function client(fetch: typeof globalThis.fetch, token?: string) {
  const onUnauthorized = vi.fn<() => void>()
  const c = createClient({
    baseUrl: 'http://api',
    token: () => token,
    onUnauthorized,
    fetch,
  })
  return { c, onUnauthorized }
}

describe('createClient', () => {
  it('manda o token, o corpo em JSON e a revisão no If-Match', async () => {
    const fetch = reply(200, { ok: true }, { ETag: '"7"' })
    const { c } = client(fetch, 'nxs_abc')

    const res = await c.put('/sheets/1', { data: {} }, 6)

    expect(res).toEqual({ data: { ok: true }, etag: 7 })
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('http://api/sheets/1')
    expect(init?.headers).toEqual({
      Authorization: 'Bearer nxs_abc',
      'Content-Type': 'application/json',
      'If-Match': '"6"',
    })
    expect(init?.body).toBe('{"data":{}}')
  })

  it('não manda Authorization sem token', async () => {
    const fetch = reply(204)
    const { c } = client(fetch)
    const res = await c.post('/auth/logout')
    expect(res.data).toBeUndefined()
    expect(fetch.mock.calls[0]![1]?.headers).toEqual({})
  })

  it('lê o erro do core com params e violações', async () => {
    const { c } = client(
      reply(422, {
        error: { code: 'sheet.invalid' },
        violations: [{ step: 's', path: 'p', code: 'x' }],
      }),
    )
    const err = await c.post('/characters', {}).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 422, code: 'sheet.invalid', violations: [{ code: 'x' }] })
  })

  it('lê o Retry-After do limite de tentativas', async () => {
    const { c } = client(
      reply(429, { error: { code: 'auth.rateLimited' } }, { 'Retry-After': '42' }),
    )
    await expect(c.post('/auth/login', {})).rejects.toMatchObject({
      code: 'auth.rateLimited',
      retryAfter: 42,
    })
  })

  it('avisa o 401 só quando havia token', async () => {
    const withToken = client(reply(401, { error: { code: 'auth.unauthenticated' } }), 'nxs_velho')
    await expect(withToken.c.get('/me')).rejects.toMatchObject({ status: 401 })
    expect(withToken.onUnauthorized).toHaveBeenCalledOnce()

    const login = client(reply(401, { error: { code: 'auth.invalidCredentials' } }))
    await expect(login.c.post('/auth/login', {})).rejects.toMatchObject({
      code: 'auth.invalidCredentials',
    })
    expect(login.onUnauthorized).not.toHaveBeenCalled()
  })

  it('transforma falha de rede em ApiError com status 0', async () => {
    const { c } = client(
      vi.fn<typeof fetch>(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await expect(c.get('/me')).rejects.toMatchObject({ status: 0, code: NETWORK_ERROR })
  })

  it('aguenta corpo de erro que não é JSON', async () => {
    const { c } = client(
      vi.fn<typeof fetch>(async () => new Response('Internal Server Error', { status: 500 })),
    )
    await expect(c.get('/me')).rejects.toMatchObject({ status: 500, code: 'unknown' })
  })
})
