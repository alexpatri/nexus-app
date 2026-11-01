// Estratégia de Shadowrun 5e no app: porte de internal/rules/shadowrun do core.
// O app calcula na hora, o core confere com autoridade, e os dois rodam as
// mesmas fixtures (shadowrun-contrato-da-ficha.md).
import { type Env, evaluate } from '@/core/rules/expr'
import type { RulesSystem, Summary, Violation } from '@/core/rules/system'
import type { Catalogs, Metatype, PriorityRow } from './catalogs'
import { baseAttrs, columns, lenient, type Sheet, specialAttrs, violation } from './validate'

export const codes = [
  'shape.invalid',
  'catalog.unknownId',
  'required',
  'priorities.duplicate',
  'metatype.notAtPriority',
  'attributes.aboveMax',
  'attributes.tooManyAtMax',
  'attributes.notAllowed',
  'budget.exceeded',
]

export interface Budget {
  total: number
  spent: number
}

export interface Derived {
  attributes?: Record<string, { natural: number; augmented: number }>
  essence?: number
  limits?: Record<string, number>
  initiative?: Record<string, { base: number; dice: number }>
  monitors?: Record<string, number>
  armor?: number
  attributeTests?: Record<string, number>
  movement?: Record<string, number>
  lifting?: Record<string, number>
  reputation: Record<string, number>
  budgets: Record<string, Budget>
}

// O que Strict, derive e summarize compartilham. O que não dá para calcular
// com o data atual fica ausente.
interface Calc {
  natural: Record<string, number>
  essence?: number
  metatypeAtPriority: boolean
  budgets: Record<string, Budget>
}

export class InvalidSheet extends Error {
  constructor(readonly violations: Violation[]) {
    super('shadowrun: data não passa em Lenient')
  }
}

const withEdge = [...baseAttrs, 'edg']

// pt-BR, sem zeros à direita.
const number = (x: number) => String(x).replace('.', ',')

export function createShadowrun(catalogs: Catalogs): RulesSystem {
  const steps = catalogs.system.creation.steps.map((s) => s.id)
  const metatypes = new Map<string, Metatype>(catalogs.metatypes.metatypes.map((m) => [m.id, m]))
  const priorities = new Map<string, PriorityRow>(
    catalogs.priorities.rows.map((r) => [r.priority, r]),
  )
  const mech = catalogs.mechanics
  const formulas = {
    limits: {
      physical: mech.derived.limits.physical.value,
      mental: mech.derived.limits.mental.value,
      social: mech.derived.limits.social.value,
    },
    attributeTests: {
      composure: mech.derived.attributeTests.composure.pool,
      judgeIntentions: mech.derived.attributeTests.judgeIntentions.pool,
      memory: mech.derived.attributeTests.memory.pool,
      liftCarry: mech.derived.attributeTests.liftCarry.pool,
    },
  }
  check()

  // Avalia toda fórmula usada com um ambiente completo: ref faltando ou
  // fórmula malformada no catálogo falha na criação, não na primeira ficha.
  function check() {
    if (steps.length === 0 || metatypes.size === 0 || priorities.size !== 5) {
      throw new Error('shadowrun: catálogos incompletos')
    }
    const env: Env = { rating: 1, 'karma.total': 0, 'attr.ess': 6 }
    for (const a of [...baseAttrs, ...specialAttrs]) env[`attr.${a}`] = 1
    const d = mech.derived
    const all = [
      d.initiative.physical.base,
      d.initiative.matrixAR.base,
      d.monitors.physical.boxes,
      d.monitors.stun.boxes,
      d.monitors.overflow.boxes,
      d.lifting.lift,
      d.lifting.overhead,
      d.lifting.carry,
      d.movement.walk,
      d.movement.run,
      d.reputation.streetCred.value,
      mech.creation.skills.knowledgePoints,
      mech.creation.contacts.karma,
      mech.progression.costs.attribute,
      ...Object.values(formulas.limits),
      ...Object.values(formulas.attributeTests),
    ]
    for (const f of all) evaluate(f, env)
  }

  function stepOrder(step: string) {
    const i = steps.indexOf(step)
    return i < 0 ? steps.length + 1 : i + 1
  }

  function parse(data: unknown): Sheet {
    const vs = lenient(data, metatypes)
    if (vs.length > 0) throw new InvalidSheet(vs)
    return data as Sheet
  }

  function env(c: Calc): Env {
    const e: Env = { 'karma.total': 0 }
    for (const [a, v] of Object.entries(c.natural)) e[`attr.${a}`] = v
    if (c.essence !== undefined) e['attr.ess'] = c.essence
    return e
  }

  function calc(d: Sheet): Calc {
    const attrs = d.attributes ?? {}
    const prio = d.priorities ?? {}
    const m = d.metatype ? metatypes.get(d.metatype) : undefined
    const c: Calc = { natural: {}, metatypeAtPriority: false, budgets: {} }
    const evalInt = (f: unknown, e: Env) => Math.trunc(evaluate(f, e))
    const points = (a: string) => attrs[a]?.points ?? 0
    const karma = (a: string) => attrs[a]?.karma ?? 0

    if (m) {
      for (const a of withEdge) c.natural[a] = (m.attributes[a]?.min ?? 0) + points(a) + karma(a)
      c.essence = m.attributes.ess?.start ?? 0
    }

    const metaRow = priorities.get(prio.metatype ?? '')
    for (const opt of metaRow?.metatype ?? []) {
      if (opt.metatype === d.metatype) {
        c.metatypeAtPriority = true
        const spent = specialAttrs.reduce((sum, a) => sum + points(a), 0)
        c.budgets.special = { total: opt.specialPoints, spent }
      }
    }
    const attrRow = priorities.get(prio.attributes ?? '')
    if (attrRow) {
      c.budgets.attributes = {
        total: attrRow.attributes,
        spent: baseAttrs.reduce((s, a) => s + points(a), 0),
      }
    }
    const skillRow = priorities.get(prio.skills ?? '')
    if (skillRow) {
      c.budgets.skills = { total: skillRow.skills.points, spent: 0 }
      c.budgets.skillGroups = { total: skillRow.skills.groupPoints, spent: 0 }
    }
    const resRow = priorities.get(prio.resources ?? '')
    if (resRow) c.budgets.nuyen = { total: resRow.resources, spent: 0 }
    if (m) {
      const e = env(c)
      c.budgets.knowledge = { total: evalInt(mech.creation.skills.knowledgePoints, e), spent: 0 }
      c.budgets.contacts = { total: evalInt(mech.creation.contacts.karma, e), spent: 0 }
    }

    // Carma sobe degrau a degrau a partir do valor com os pontos. Sem metatipo,
    // o degrau inicial dos atributos comuns é desconhecido e o orçamento some.
    let spent = 0
    let priced = true
    for (const a of [...baseAttrs, ...specialAttrs]) {
      if (karma(a) === 0) continue
      let from = points(a)
      if (a !== 'mag' && a !== 'res') {
        if (!m) {
          priced = false
          break
        }
        from += m.attributes[a]?.min ?? 0
      }
      for (let r = from + 1; r <= from + karma(a); r++) {
        spent += evalInt(mech.progression.costs.attribute, { rating: r })
      }
    }
    if (priced) c.budgets.karma = { total: mech.creation.karma, spent }
    return c
  }

  // A camada de compra mais de fora: o carma sobe por cima dos pontos.
  const layer = (a: string, d: Sheet) =>
    (d.attributes?.[a]?.karma ?? 0) > 0 ? `attributes.${a}.karma` : `attributes.${a}.points`

  function strict(d: Sheet, c: Calc): Violation[] {
    const vs: Violation[] = []
    const required = (field: string) => vs.push(violation(field, 'required', { field }))
    const prio = d.priorities ?? {}

    for (const col of columns) if (!prio[col]) required(`priorities.${col}`)
    if (!d.metatype) required('metatype')
    if (!(d.identity?.name ?? '').trim()) required('identity.name')
    // resources entra na fatia 4.4; até lá, os dois sempre faltam.
    required('resources.lifestyles')
    required('resources.startingNuyenRoll')

    const byLetter = new Map<string, string[]>()
    for (const col of columns) {
      const l = prio[col]
      if (l) byLetter.set(l, [...(byLetter.get(l) ?? []), col])
    }
    for (const l of [...byLetter.keys()].sort()) {
      const cols = byLetter.get(l)!
      if (cols.length > 1) {
        vs.push(violation('priorities', 'priorities.duplicate', { priority: l, columns: cols }))
      }
    }

    if (d.metatype && prio.metatype && !c.metatypeAtPriority) {
      vs.push(
        violation('metatype', 'metatype.notAtPriority', {
          metatype: d.metatype,
          priority: prio.metatype,
        }),
      )
    }

    for (const a of ['mag', 'res']) {
      const b = d.attributes?.[a]
      if ((b?.points ?? 0) + (b?.karma ?? 0) > 0) {
        vs.push(violation(layer(a, d), 'attributes.notAllowed', { attribute: a }))
      }
    }
    const m = d.metatype ? metatypes.get(d.metatype) : undefined
    if (m) {
      const atMax: string[] = []
      for (const a of withEdge) {
        const value = c.natural[a] ?? 0
        const max = m.attributes[a]?.max ?? 0
        if (value > max) {
          vs.push(violation(layer(a, d), 'attributes.aboveMax', { attribute: a, value, max }))
        }
        if (a !== 'edg' && value >= max) atMax.push(a)
      }
      if (atMax.length > 1) {
        vs.push(
          violation('attributes', 'attributes.tooManyAtMax', { attributes: atMax, allowed: 1 }),
        )
      }
    }

    for (const id of Object.keys(c.budgets).sort()) {
      const b = c.budgets[id]!
      if (b.spent > b.total) {
        vs.push(
          violation(`budgets.${id}`, 'budget.exceeded', {
            budget: id,
            total: b.total,
            spent: b.spent,
          }),
        )
      }
    }
    return vs
  }

  function validate(data: unknown, mode: 'lenient' | 'strict'): Violation[] {
    const vs = lenient(data, metatypes)
    if (vs.length > 0 || mode === 'lenient') return vs
    const d = data as Sheet
    return strict(d, calc(d))
  }

  function derive(data: unknown): Derived {
    const d = parse(data)
    const c = calc(d)
    const e = env(c)
    const ev = (f: unknown) => evaluate(f, e)
    const md = mech.derived
    const out: Derived = {
      reputation: {
        streetCred: ev(md.reputation.streetCred.value),
        notoriety: md.reputation.notoriety.base,
        publicAwareness: md.reputation.publicAwareness.base,
      },
      budgets: c.budgets,
    }
    const m = d.metatype ? metatypes.get(d.metatype) : undefined
    if (!m) return out

    out.attributes = Object.fromEntries(
      Object.entries(c.natural).map(([a, v]) => [a, { natural: v, augmented: v }]),
    )
    out.essence = c.essence
    const map = <K extends string>(fs: Record<K, unknown>) =>
      Object.fromEntries(Object.entries(fs).map(([k, f]) => [k, ev(f)]))
    out.limits = map(formulas.limits)
    const dice = (n: number) => Math.min(n, md.initiative.maxDice)
    out.initiative = {
      physical: { base: ev(md.initiative.physical.base), dice: dice(md.initiative.physical.dice) },
      matrixAR: { base: ev(md.initiative.matrixAR.base), dice: dice(md.initiative.matrixAR.dice) },
    }
    out.monitors = {
      physical: ev(md.monitors.physical.boxes),
      stun: ev(md.monitors.stun.boxes),
      overflow: ev(md.monitors.overflow.boxes),
      woundPenalty: 0,
    }
    out.armor = m.traits
      .flatMap((t) => t.modifiers ?? [])
      .filter((mod) => mod.target === 'armor')
      .reduce((sum, mod) => sum + ev(mod.add), 0)
    out.attributeTests = map(formulas.attributeTests)
    out.movement = {
      walk: ev(md.movement.walk),
      run: ev(md.movement.run),
      sprintPerHit: m.sprintPerHit,
    }
    out.lifting = {
      lift: ev(md.lifting.lift),
      overhead: ev(md.lifting.overhead),
      carry: ev(md.lifting.carry),
    }
    return out
  }

  function summarize(data: unknown): Summary {
    const d = parse(data)
    const c = calc(d)
    const parts: string[] = []
    const m = d.metatype ? metatypes.get(d.metatype) : undefined
    if (m) parts.push(m.name)
    const concept = (d.identity?.concept ?? '').trim()
    if (concept) parts.push(concept)

    const sum: Summary = {
      title: (d.identity?.name ?? '').trim(),
      subtitle: parts.length > 0 ? parts.join(' · ') : 'Sem metatipo',
    }
    const highlights: { label: string; value: string }[] = []
    if (c.essence !== undefined) highlights.push({ label: 'Essência', value: number(c.essence) })
    const k = c.budgets.karma
    if (k) highlights.push({ label: 'Carma', value: number(k.total - k.spent) })
    if (highlights.length > 0) sum.highlights = highlights

    // Progresso é o primeiro passo que ainda falta, calculado de data.
    let step = steps.length
    if (!concept) step = 1
    else for (const v of strict(d, c)) step = Math.min(step, stepOrder(v.step))
    sum.progress = { step, total: steps.length }
    return sum
  }

  return { key: { system: 'shadowrun', version: '5e' }, validate, derive, summarize }
}
