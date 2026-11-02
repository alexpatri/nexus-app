import { evaluate } from '@/core/rules/expr'
import type { Violation } from '@/core/rules/system'
import type { Mechanics } from './catalogs'
import type { Lookup } from './lookup'
import { freeRatings, restrictedAllowed } from './magic'
import type { Effects } from './qualities'
import { type Sheet, type SkillBuy, violation } from './validate'

export interface Rated {
  rating?: number
  pool?: number
  native?: true
}

export interface SkillsOut {
  active?: Record<string, Rated>
  knowledge?: Record<string, Rated>
  languages?: Record<string, Rated>
}

const groupOf = (l: Lookup, id: string) => l.skills.get(id)?.group ?? ''

function groupRating(l: Lookup, d: Sheet, id: string): number {
  const g = d.skills?.groups?.[groupOf(l, id)]
  return (g?.points ?? 0) + (g?.karma ?? 0)
}

// Nível de cada perícia ativa: dado pela prioridade + grupo comprado + pontos + carma.
export function activeRatings(l: Lookup, d: Sheet): Record<string, number> {
  const r = freeRatings(l, d)
  for (const [g, b] of Object.entries(d.skills?.groups ?? {})) {
    for (const id of l.groups.get(g) ?? []) r[id] = (r[id] ?? 0) + (b.points ?? 0) + (b.karma ?? 0)
  }
  for (const [id, b] of Object.entries(d.skills?.active ?? {})) {
    r[id] = (r[id] ?? 0) + (b.points ?? 0) + (b.karma ?? 0)
  }
  for (const id of Object.keys(r)) if (r[id] === 0) delete r[id]
  return r
}

const paid = (b: SkillBuy, with_: 'points' | 'karma') =>
  b.specialization?.paidWith === with_ ? 1 : 0

// Pontos e carma das perícias, para os orçamentos.
export function skillCosts(l: Lookup, mech: Mechanics, d: Sheet) {
  const costs = mech.progression.costs
  const specCost = mech.creation.skills.specializationCost
  const steps = (f: unknown, from: number, n: number) => {
    let total = 0
    for (let r = from + 1; r <= from + n; r++) total += Math.trunc(evaluate(f, { rating: r }))
    return total
  }
  const free = freeRatings(l, d)
  const spec = (b: SkillBuy) => paid(b, 'karma') * Math.trunc(evaluate(costs.specialization, {}))
  let points = 0
  let groups = 0
  let knowledge = 0
  let karma = 0
  for (const [id, b] of Object.entries(d.skills?.active ?? {})) {
    points += (b.points ?? 0) + paid(b, 'points') * specCost
    karma +=
      steps(
        costs.activeSkill,
        (free[id] ?? 0) + groupRating(l, d, id) + (b.points ?? 0),
        b.karma ?? 0,
      ) + spec(b)
  }
  for (const b of Object.values(d.skills?.groups ?? {})) {
    groups += b.points ?? 0
    karma += steps(costs.skillGroup, b.points ?? 0, b.karma ?? 0)
  }
  for (const k of d.skills?.knowledge ?? []) {
    knowledge += (k.points ?? 0) + paid(k, 'points') * specCost
    karma += steps(costs.knowledgeSkill, k.points ?? 0, k.karma ?? 0) + spec(k)
  }
  for (const lang of d.skills?.languages ?? []) {
    if (lang.native) continue
    knowledge += (lang.points ?? 0) + paid(lang, 'points') * specCost
    karma += steps(costs.languageSkill, lang.points ?? 0, lang.karma ?? 0) + spec(lang)
  }
  return { points, groups, knowledge, karma }
}

function rated(rating: number, attr: number | undefined): Rated {
  return attr === undefined ? { rating } : { rating, pool: attr + rating }
}

// natural são os atributos ampliados; bonus soma à parada (Habilidade Aprimorada).
export function deriveSkills(
  l: Lookup,
  d: Sheet,
  natural: Record<string, number>,
  bonus: Record<string, number> = {},
): SkillsOut | undefined {
  const out: SkillsOut = {}
  const active = Object.entries(activeRatings(l, d))
  if (active.length) {
    out.active = Object.fromEntries(
      active.map(([id, r]) => {
        const attr = natural[l.skills.get(id)?.attribute ?? '']
        return [id, rated(r, attr === undefined ? undefined : attr + (bonus[id] ?? 0))]
      }),
    )
  }
  const knowledge = (d.skills?.knowledge ?? []).filter((k) => (k.points ?? 0) + (k.karma ?? 0) > 0)
  if (knowledge.length) {
    out.knowledge = Object.fromEntries(
      knowledge.map((k) => [
        k.key,
        rated((k.points ?? 0) + (k.karma ?? 0), natural[l.knowledge.get(k.category) ?? '']),
      ]),
    )
  }
  const languages: [string, Rated][] = []
  for (const lang of d.skills?.languages ?? []) {
    const r = (lang.points ?? 0) + (lang.karma ?? 0)
    if (lang.native) languages.push([lang.key, { native: true }])
    else if (r > 0) languages.push([lang.key, rated(r, natural.int)])
  }
  if (languages.length) out.languages = Object.fromEntries(languages)
  return out.active || out.knowledge || out.languages ? out : undefined
}

// A camada de compra mais de fora, como nos atributos; sem pontos nem carma
// próprios, o nível veio do grupo.
function skillLayer(l: Lookup, id: string, b: SkillBuy | undefined): string {
  if ((b?.karma ?? 0) > 0) return `skills.active.${id}.karma`
  if ((b?.points ?? 0) > 0) return `skills.active.${id}.points`
  return `skills.groups.${groupOf(l, id)}`
}

export function strictSkills(l: Lookup, mech: Mechanics, d: Sheet, fx: Effects): Violation[] {
  const vs: Violation[] = []
  const ratings = activeRatings(l, d)
  for (const id of Object.keys(ratings).sort()) {
    const limit = mech.creation.skills.maxRating + (fx.skillMax[id] ?? 0)
    if (ratings[id]! > limit) {
      vs.push(
        violation(skillLayer(l, id, d.skills?.active?.[id]), 'skills.aboveMax', {
          skill: id,
          value: ratings[id],
          max: limit,
        }),
      )
    }
    if (l.skills.get(id)?.restricted && !restrictedAllowed(l, d, id)) {
      vs.push(violation(`skills.active.${id}`, 'skills.restricted', { skill: id }))
    }
  }
  const active = d.skills?.active ?? {}
  for (const id of Object.keys(active).sort()) {
    if (groupRating(l, d, id) === 0) continue
    const b = active[id]!
    if ((b.points ?? 0) > 0) {
      vs.push(
        violation(`skills.active.${id}.points`, 'skills.groupConflict', {
          skill: id,
          group: groupOf(l, id),
        }),
      )
    }
    if (b.specialization) {
      vs.push(
        violation(`skills.active.${id}.specialization`, 'skills.specializationNotAllowed', {
          skill: id,
        }),
      )
    }
  }
  const natives = (d.skills?.languages ?? []).filter((x) => x.native).length
  const expected = 1 + fx.natives
  if (natives !== expected) {
    vs.push(violation('skills.languages', 'skills.nativeLanguageCount', { expected, got: natives }))
  }
  return vs
}
