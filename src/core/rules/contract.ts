// Porte do rulestest do core: confere uma estratégia contra uma fixture do
// systems e devolve as divergências em vez de falhar, como o rulestest.Check.
import type { RulesSystem, Violation } from './system'

export interface Fixture {
  name: string
  schemaVersion: number
  data: unknown
  expect: {
    lenient?: Violation[]
    strict?: Violation[]
    derived?: unknown
    summary?: unknown
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]))
  }
  if (isObject(a)) {
    if (!isObject(b)) return false
    const keys = Object.keys(a)
    return (
      keys.length === Object.keys(b).length &&
      keys.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]))
    )
  }
  return Object.is(a, b) || a === b
}

// Passa pelo JSON, como na resposta da API, e ordena: a ordem não faz parte do contrato.
export function normalize(vs: Violation[]): Violation[] {
  const out = (JSON.parse(JSON.stringify(vs)) as Violation[]).map((v) => {
    if (v.params && Object.keys(v.params).length === 0) delete v.params
    return v
  })
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  return out.sort((a, b) => cmp(a.step, b.step) || cmp(a.path, b.path) || cmp(a.code, b.code))
}

// Toda chave de want existe em got com o mesmo valor; listas precisam ter o
// mesmo tamanho, e cada item é conferido como subconjunto.
export function subset(where: string, want: unknown, got: unknown): string[] {
  const problems: string[] = []
  const walk = (p: string, w: unknown, g: unknown) => {
    if (isObject(w)) {
      if (!isObject(g)) return problems.push(`${p}: got ${JSON.stringify(g)}, want objeto`)
      for (const k of Object.keys(w).sort()) {
        if (!Object.hasOwn(g, k)) problems.push(`${p}.${k}: ausente`)
        else walk(`${p}.${k}`, w[k], g[k])
      }
    } else if (Array.isArray(w)) {
      if (!Array.isArray(g) || g.length !== w.length) {
        return problems.push(`${p}: got ${JSON.stringify(g)}, want ${JSON.stringify(w)}`)
      }
      w.forEach((x, i) => walk(`${p}[${i}]`, x, g[i]))
    } else if (!deepEqual(w, g)) {
      problems.push(`${p}: got ${JSON.stringify(g)}, want ${JSON.stringify(w)}`)
    }
  }
  walk(where, JSON.parse(JSON.stringify(want)), JSON.parse(JSON.stringify(got ?? null)))
  return problems
}

function attempt<T>(f: () => T): { value?: T; error?: string } {
  try {
    return { value: f() }
  } catch (e) {
    return { error: String(e) }
  }
}

export function check(sys: RulesSystem, f: Fixture, codes: string[]): string[] {
  const problems: string[] = []
  if (f.schemaVersion !== 1) return [`schemaVersion ${f.schemaVersion} fora de 1..1`]

  for (const mode of ['lenient', 'strict'] as const) {
    const got = normalize(sys.validate(f.data, mode))
    for (const v of got) {
      if (!codes.includes(v.code)) problems.push(`${mode}: código não declarado "${v.code}"`)
    }
    const expected = f.expect[mode]
    if (expected && !deepEqual(got, normalize(expected))) {
      problems.push(
        `${mode}:\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(normalize(expected))}`,
      )
    }
  }

  const derived = attempt(() => sys.derive(f.data))
  const again = attempt(() => sys.derive(f.data))
  if (!deepEqual(derived, again)) problems.push('derived: derive não é determinístico')
  if (f.expect.derived !== undefined) {
    if (derived.error) problems.push(`derived: ${derived.error}`)
    else problems.push(...subset('derived', f.expect.derived, derived.value))
  }

  const summary = attempt(() => sys.summarize(f.data))
  const summaryAgain = attempt(() => sys.summarize(f.data))
  if (!deepEqual(summary, summaryAgain)) problems.push('summary: summarize não é determinístico')
  if (f.expect.summary !== undefined) {
    if (summary.error) problems.push(`summary: ${summary.error}`)
    else problems.push(...subset('summary', f.expect.summary, summary.value))
  }
  return problems
}
