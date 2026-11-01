import { createStore, get, set, type UseStore } from 'idb-keyval'

interface Cached {
  etag?: string
  body: unknown
}

export class CatalogUnavailable extends Error {
  constructor(readonly key: string) {
    super(`catálogo indisponível: ${key}`)
  }
}

export class PointerNotFound extends Error {
  constructor(readonly pointer: string) {
    super(`ponteiro não resolve: ${pointer}`)
  }
}

export interface LoaderOptions {
  baseUrl: string
  fetch?: typeof fetch
  store?: UseStore
}

const MANIFEST = 'system'

// Mesma regra do validate.py e do core: "arquivo.json#a.b.c" segue chaves de
// objeto; sem "#", é o arquivo inteiro.
export function parsePointer(pointer: string) {
  const [file, path = ''] = pointer.split('#', 2) as [string, string?]
  return { file, path: path.split('.').filter(Boolean) }
}

export function follow(root: unknown, path: string[], pointer: string): unknown {
  let node = root
  for (const part of path) {
    if (
      node === null ||
      typeof node !== 'object' ||
      Array.isArray(node) ||
      !Object.hasOwn(node, part)
    ) {
      throw new PointerNotFound(pointer)
    }
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

// Catálogos são o mesmo arquivo para todo mundo e mudam raramente. O que está no
// aparelho responde na hora, também sem conexão; a revalidação com If-None-Match
// roda em segundo plano e o catálogo novo vale a partir da próxima abertura do
// app, para uma mesma sessão nunca trocar de regra no meio de uma ficha.
export function createCatalogLoader(opts: LoaderOptions) {
  const doFetch = opts.fetch ?? fetch.bind(globalThis)
  const store = opts.store ?? createStore('nexus-catalogs', 'catalogs')
  const session = new Map<string, Promise<unknown>>()
  const revalidations: Promise<void>[] = []

  function url(system: string, version: string, name: string) {
    const base = `${opts.baseUrl}/api/${system}/${version}`
    return name === MANIFEST ? base : `${base}/${name}`
  }

  // undefined é 304: o que está no aparelho continua valendo.
  async function download(key: string, target: string, etag?: string): Promise<Cached | undefined> {
    const headers: Record<string, string> = etag ? { 'If-None-Match': etag } : {}
    const res = await doFetch(target, { headers, cache: 'no-store' })
    if (res.status === 304) return undefined
    if (!res.ok) throw new CatalogUnavailable(key)
    const fresh: Cached = { etag: res.headers.get('ETag') ?? undefined, body: await res.json() }
    await set(key, fresh, store).catch(() => {})
    return fresh
  }

  async function revalidate(key: string, target: string, etag?: string) {
    try {
      await download(key, target, etag)
    } catch {
      // Sem conexão ou servidor fora: segue com o que está no aparelho.
    }
  }

  async function load(system: string, version: string, name: string): Promise<unknown> {
    const key = `${system}/${version}/${name}`
    const target = url(system, version, name)
    const cached = await get<Cached>(key, store).catch(() => undefined)
    if (cached) {
      revalidations.push(revalidate(key, target, cached.etag))
      return cached.body
    }
    const fresh = await download(key, target).catch(() => undefined)
    if (!fresh) throw new CatalogUnavailable(key)
    return fresh.body
  }

  function catalog(system: string, version: string, file: string): Promise<unknown> {
    const name = file.replace(/\.json$/, '')
    const key = `${system}/${version}/${name}`
    let pending = session.get(key)
    if (!pending) {
      pending = load(system, version, name)
      // Falha não fica memorizada: a próxima chamada tenta de novo.
      pending.catch(() => session.delete(key))
      session.set(key, pending)
    }
    return pending
  }

  async function resolve(system: string, version: string, pointer: string): Promise<unknown> {
    const { file, path } = parsePointer(pointer)
    return follow(await catalog(system, version, file), path, pointer)
  }

  // Baixa o sistema inteiro, para a mesa funcionar sem conexão.
  async function preload(system: string, version: string) {
    const manifest = (await catalog(system, version, MANIFEST)) as { catalogs?: string[] }
    await Promise.all((manifest.catalogs ?? []).map((file) => catalog(system, version, file)))
  }

  return {
    catalog,
    resolve,
    preload,
    // Para testes: espera as revalidações em segundo plano terminarem.
    settled: () => Promise.all(revalidations).then(() => {}),
  }
}

export type CatalogLoader = ReturnType<typeof createCatalogLoader>
