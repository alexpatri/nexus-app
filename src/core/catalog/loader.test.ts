import 'fake-indexeddb/auto'
import { createStore } from 'idb-keyval'
import { describe, expect, it, vi } from 'vitest'

import { CatalogUnavailable, createCatalogLoader, PointerNotFound } from './loader'

const mechanics = {
  derived: { limits: { physical: { value: { op: 'add', of: [1, 2] } } } },
  list: [{ id: 'a' }],
}
const manifest = { id: 'shadowrun', catalogs: ['mechanics.json', 'qualities.json'] }

type Route = { status: number; body?: unknown; etag?: string }

// Servidor falso: responde por URL e honra If-None-Match como a API de sistemas.
function server(routes: Record<string, Route>) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const route = routes[String(input)]
    if (!route) return new Response(null, { status: 404 })
    const ifNoneMatch = (init?.headers as Record<string, string> | undefined)?.['If-None-Match']
    if (route.etag && ifNoneMatch === route.etag) return new Response(null, { status: 304 })
    return new Response(JSON.stringify(route.body), {
      status: route.status,
      headers: route.etag ? { ETag: route.etag } : {},
    })
  })
}

const offline = () =>
  vi.fn<typeof fetch>(async () => {
    throw new TypeError('Failed to fetch')
  })

let n = 0
const freshStore = () => createStore(`test-${++n}`, 'catalogs')

const BASE = 'http://sys/api/shadowrun/5e'

describe('catalog loader', () => {
  it('busca, guarda e serve do aparelho sem conexão na próxima abertura', async () => {
    const store = freshStore()
    const first = createCatalogLoader({
      baseUrl: 'http://sys',
      store,
      fetch: server({ [`${BASE}/mechanics`]: { status: 200, body: mechanics, etag: '"v1"' } }),
    })
    expect(await first.catalog('shadowrun', '5e', 'mechanics.json')).toEqual(mechanics)

    const reopened = createCatalogLoader({ baseUrl: 'http://sys', store, fetch: offline() })
    expect(await reopened.catalog('shadowrun', '5e', 'mechanics')).toEqual(mechanics)
    await reopened.settled()
  })

  it('revalida com If-None-Match e só troca o catálogo na próxima abertura', async () => {
    const store = freshStore()
    const routes = {
      [`${BASE}/mechanics`]: { status: 200, body: mechanics, etag: '"v1"' } as Route,
    }
    await createCatalogLoader({ baseUrl: 'http://sys', store, fetch: server(routes) }).catalog(
      'shadowrun',
      '5e',
      'mechanics',
    )

    routes[`${BASE}/mechanics`] = { status: 200, body: { changed: true }, etag: '"v2"' }
    const fetch = server(routes)
    const second = createCatalogLoader({ baseUrl: 'http://sys', store, fetch })
    expect(await second.catalog('shadowrun', '5e', 'mechanics')).toEqual(mechanics)
    await second.settled()
    expect(fetch.mock.calls[0]![1]?.headers).toEqual({ 'If-None-Match': '"v1"' })
    expect(await second.catalog('shadowrun', '5e', 'mechanics')).toEqual(mechanics)

    const third = createCatalogLoader({ baseUrl: 'http://sys', store, fetch: offline() })
    expect(await third.catalog('shadowrun', '5e', 'mechanics')).toEqual({ changed: true })
    await third.settled()
  })

  it('304 mantém o que está no aparelho', async () => {
    const store = freshStore()
    const routes = { [`${BASE}/mechanics`]: { status: 200, body: mechanics, etag: '"v1"' } }
    await createCatalogLoader({ baseUrl: 'http://sys', store, fetch: server(routes) }).catalog(
      'shadowrun',
      '5e',
      'mechanics',
    )
    const again = createCatalogLoader({ baseUrl: 'http://sys', store, fetch: server(routes) })
    await again.catalog('shadowrun', '5e', 'mechanics')
    await again.settled()

    const offlineLater = createCatalogLoader({ baseUrl: 'http://sys', store, fetch: offline() })
    expect(await offlineLater.catalog('shadowrun', '5e', 'mechanics')).toEqual(mechanics)
    await offlineLater.settled()
  })

  it('pede cada catálogo uma vez por sessão', async () => {
    const fetch = server({ [`${BASE}/mechanics`]: { status: 200, body: mechanics } })
    const loader = createCatalogLoader({ baseUrl: 'http://sys', store: freshStore(), fetch })
    await Promise.all([
      loader.catalog('shadowrun', '5e', 'mechanics'),
      loader.catalog('shadowrun', '5e', 'mechanics.json'),
    ])
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('sem cache e sem conexão, falha e tenta de novo na próxima chamada', async () => {
    const fetch = offline()
    const loader = createCatalogLoader({ baseUrl: 'http://sys', store: freshStore(), fetch })
    await expect(loader.catalog('shadowrun', '5e', 'mechanics')).rejects.toBeInstanceOf(
      CatalogUnavailable,
    )
    await expect(loader.catalog('shadowrun', '5e', 'mechanics')).rejects.toBeInstanceOf(
      CatalogUnavailable,
    )
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('catálogo inexistente é CatalogUnavailable', async () => {
    const loader = createCatalogLoader({
      baseUrl: 'http://sys',
      store: freshStore(),
      fetch: server({}),
    })
    await expect(loader.catalog('shadowrun', '5e', 'nada')).rejects.toBeInstanceOf(
      CatalogUnavailable,
    )
  })

  it('resolve ponteiros como o validate.py', async () => {
    const loader = createCatalogLoader({
      baseUrl: 'http://sys',
      store: freshStore(),
      fetch: server({
        [`${BASE}/mechanics`]: { status: 200, body: mechanics },
        [BASE]: { status: 200, body: manifest },
      }),
    })
    expect(
      await loader.resolve('shadowrun', '5e', 'mechanics.json#derived.limits.physical.value'),
    ).toEqual({
      op: 'add',
      of: [1, 2],
    })
    expect(await loader.resolve('shadowrun', '5e', 'mechanics.json')).toEqual(mechanics)
    expect(await loader.resolve('shadowrun', '5e', 'system.json#id')).toBe('shadowrun')
    for (const pointer of [
      'mechanics.json#derived.nada',
      'mechanics.json#list.0',
      'mechanics.json#derived.limits.physical.value.op.x',
    ]) {
      await expect(loader.resolve('shadowrun', '5e', pointer)).rejects.toBeInstanceOf(
        PointerNotFound,
      )
    }
  })

  it('preload baixa todos os catálogos do manifesto', async () => {
    const fetch = server({
      [BASE]: { status: 200, body: manifest },
      [`${BASE}/mechanics`]: { status: 200, body: mechanics },
      [`${BASE}/qualities`]: { status: 200, body: { qualities: [] } },
    })
    const store = freshStore()
    await createCatalogLoader({ baseUrl: 'http://sys', store, fetch }).preload('shadowrun', '5e')
    expect(fetch.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      BASE,
      `${BASE}/mechanics`,
      `${BASE}/qualities`,
    ])

    const reopened = createCatalogLoader({ baseUrl: 'http://sys', store, fetch: offline() })
    expect(await reopened.catalog('shadowrun', '5e', 'qualities')).toEqual({ qualities: [] })
    await reopened.settled()
  })
})
