import { type Env, evaluate } from '@/core/rules/expr'
import type { Violation } from '@/core/rules/system'
import type { Quality, QualityOption } from './catalogs'
import type { Lookup } from './lookup'
import { type QualityItem, type Sheet, violation } from './validate'
import { present } from './resources'

interface Cost {
  fixed: number
  perLevel?: number
  options?: QualityOption[]
  sum?: { id: string; options: QualityOption[] }[]
}

// A forma do karma: um número, por nível, uma opção ou a soma de uma opção por grupo.
export function qualityCost(q: Quality): Cost {
  const k = q.karma
  if (typeof k === 'number') return { fixed: k }
  if ('perLevel' in k) return { fixed: 0, perLevel: k.perLevel }
  if ('options' in k) return { fixed: 0, options: k.options }
  return { fixed: 0, sum: k.sum }
}

export function optionKarma(opts: QualityOption[], id: string | undefined): number | undefined {
  return opts.find((o) => o.id === id)?.karma
}

const rating = (it: QualityItem) => it.rating ?? 1

// Karma de uma qualidade na ficha; opção que falta vale 0.
export function qualityKarma(q: Quality, it: QualityItem): number {
  const c = qualityCost(q)
  if (c.perLevel) return c.perLevel * rating(it)
  if (c.options) return optionKarma(c.options, it.option) ?? 0
  if (c.sum) return c.sum.reduce((t, g) => t + (optionKarma(g.options, it.options?.[g.id]) ?? 0), 0)
  return c.fixed
}

// O conjunto de onde o choice sai, se a qualidade pede um.
export function choicesFor(l: Lookup, q: Quality): string[] | undefined {
  if (q.choice) return l.choices.get(q.choice) ?? []
  const sel = q.modifiers?.find((m) => typeof m.of === 'object')?.of
  if (!sel || typeof sel !== 'object') return undefined
  return (l.choices.get(sel.choose) ?? []).filter(
    (id) => (!sel.only?.length || sel.only.includes(id)) && !sel.except?.includes(id),
  )
}

// Alvos de modificador de qualidade que a fatia 4.2 aplica; os outros entram
// com as fatias de magia, recursos e Matriz.
const appliedTargets = [
  'attr.max',
  'skill.max',
  'limit',
  'language.native',
  'reputation.notoriety',
  'monitor.overflow',
]

// Os modificadores das qualidades que valem na fatia 4.2, e o custo de cada lado.
export interface Effects {
  attrMax: Record<string, number>
  skillMax: Record<string, number>
  limit: Record<string, number>
  natives: number
  notoriety: number
  overflow: number
  positive: number
  negative: number
}

export function qualityEffects(l: Lookup, d: Sheet): Effects {
  const e: Effects = {
    attrMax: {},
    skillMax: {},
    limit: {},
    natives: 0,
    notoriety: 0,
    overflow: 0,
    positive: 0,
    negative: 0,
  }
  const bump = (m: Record<string, number>, k: string, v: number) => (m[k] = (m[k] ?? 0) + v)
  for (const it of d.qualities ?? []) {
    const q = l.qualities.get(it.id)
    if (!q) continue
    if (q.kind === 'negative') e.negative += qualityKarma(q, it)
    else e.positive += qualityKarma(q, it)
    const env: Env = { rating: rating(it) }
    const allowed = choicesFor(l, q)
    for (const m of q.modifiers ?? []) {
      if (!appliedTargets.includes(m.target)) continue
      let target = ''
      if (typeof m.of === 'string') target = m.of
      else if (m.of) {
        if (!allowed?.includes(it.choice ?? '')) continue
        target = it.choice!
      }
      const v = evaluate(m.add, env) * (m.times === undefined ? 1 : evaluate(m.times, env))
      if (m.target === 'attr.max') bump(e.attrMax, target, Math.trunc(v))
      else if (m.target === 'skill.max') bump(e.skillMax, target, Math.trunc(v))
      else if (m.target === 'limit') bump(e.limit, target, v)
      else if (m.target === 'language.native') e.natives += Math.trunc(v)
      else if (m.target === 'reputation.notoriety') e.notoriety += v
      else if (m.target === 'monitor.overflow') e.overflow += v
    }
  }
  return e
}

export function strictQualities(l: Lookup, d: Sheet, natural: Record<string, number>): Violation[] {
  const vs: Violation[] = []
  const add = (it: QualityItem, field: string, code: string, params: Record<string, unknown>) =>
    vs.push(violation(`qualities[${it.key}]${field ? `.${field}` : ''}`, code, params))
  const seen = new Set<string>()
  for (const it of d.qualities ?? []) {
    const q = l.qualities.get(it.id)
    if (!q) continue
    const p = { quality: q.id }
    if (q.levels && (rating(it) < 1 || rating(it) > q.levels.max)) {
      add(it, 'rating', 'qualities.levelOutOfRange', { quality: q.id, max: q.levels.max })
    }
    const cost = qualityCost(q)
    if (cost.options && optionKarma(cost.options, it.option) === undefined) {
      add(it, 'option', 'qualities.optionRequired', p)
    }
    if (cost.sum?.some((g) => optionKarma(g.options, it.options?.[g.id]) === undefined)) {
      add(it, 'options', 'qualities.optionRequired', p)
    }
    const allowed = choicesFor(l, q)
    if (allowed) {
      if (!it.choice) add(it, 'choice', 'qualities.choiceRequired', p)
      else if (!allowed.includes(it.choice)) {
        add(it, 'choice', 'qualities.choiceNotAllowed', { quality: q.id, choice: it.choice })
      }
    }
    const r = q.requires
    if (r?.metatype?.length && d.metatype && !r.metatype.includes(d.metatype)) {
      add(it, '', 'qualities.requirementNotMet', { quality: q.id, requirement: 'metatype' })
    }
    if (r?.special && (natural[r.special] ?? 0) <= 0) {
      add(it, '', 'qualities.requirementNotMet', { quality: q.id, requirement: r.special })
    }
    for (const x of q.excludes ?? []) {
      if (present(d, x)) add(it, '', 'qualities.excluded', { quality: q.id, with: x.id })
    }
    const key = `${q.id}\u0000${it.choice ?? ''}`
    if (q.unique && seen.has(q.id)) add(it, '', 'qualities.unique', p)
    else if (!q.unique && seen.has(key)) add(it, '', 'qualities.duplicate', p)
    seen.add(q.id)
    seen.add(key)
  }
  return vs
}
