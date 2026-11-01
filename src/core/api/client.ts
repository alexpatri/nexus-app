export interface Violation {
  step: string
  path: string
  code: string
  params?: Record<string, unknown>
}

// Erro da API no formato do core: { error: { code, params }, violations? }.
// status 0 é falha de rede, sem resposta do servidor.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly params: Record<string, unknown> = {},
    readonly violations: Violation[] = [],
    readonly retryAfter?: number,
  ) {
    super(code)
  }
}

export const NETWORK_ERROR = 'network'
export const UNKNOWN_ERROR = 'unknown'

export interface ClientOptions {
  baseUrl: string
  token: () => string | undefined
  // Chamado em todo 401 de rota autenticada: o token não vale mais.
  onUnauthorized: () => void
  fetch?: typeof fetch
}

export interface RequestOptions {
  body?: unknown
  ifMatch?: number
}

export interface Response<T> {
  data: T
  etag?: number
}

export function createClient(opts: ClientOptions) {
  const doFetch = opts.fetch ?? fetch.bind(globalThis)

  async function request<T>(
    method: string,
    path: string,
    req: RequestOptions = {},
  ): Promise<Response<T>> {
    const headers: Record<string, string> = {}
    const token = opts.token()
    if (token) headers.Authorization = `Bearer ${token}`
    if (req.body !== undefined) headers['Content-Type'] = 'application/json'
    if (req.ifMatch !== undefined) headers['If-Match'] = `"${req.ifMatch}"`

    let res: globalThis.Response
    try {
      res = await doFetch(opts.baseUrl + path, {
        method,
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
      })
    } catch {
      throw new ApiError(0, NETWORK_ERROR)
    }

    const text = await res.text()
    const json = text ? safeParse(text) : undefined

    if (!res.ok) {
      const error = (json as { error?: { code?: string; params?: Record<string, unknown> } })?.error
      const violations = (json as { violations?: Violation[] })?.violations
      const retryAfter = Number(res.headers.get('Retry-After')) || undefined
      if (res.status === 401 && token) opts.onUnauthorized()
      throw new ApiError(
        res.status,
        error?.code ?? UNKNOWN_ERROR,
        error?.params,
        violations,
        retryAfter,
      )
    }

    const etag =
      Number(res.headers.get('ETag')?.replace(/^W\//, '').replaceAll('"', '')) || undefined
    return { data: json as T, etag }
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
    put: <T>(path: string, body: unknown, ifMatch?: number) =>
      request<T>('PUT', path, { body, ifMatch }),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
    delete: <T>(path: string) => request<T>('DELETE', path),
  }
}

export type Client = ReturnType<typeof createClient>

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
