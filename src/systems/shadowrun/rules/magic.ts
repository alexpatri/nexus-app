import { type Env, evaluate, ExprError } from '@/core/rules/expr'
import type { Violation } from '@/core/rules/system'
import type { AdeptPower, MagicEntry, Mechanics } from './catalogs'
import type { Lookup } from './lookup'
import { type Sheet, violation } from './validate'

export interface PowerItem {
  key: string
  id: string
  rating?: number
  parameter?: string
}

export interface MagicData {
  awakening?: string
  tradition?: string
  aspect?: string
  mentorAdvantage?: string
  freeSkills?: string[]
  freeSkillGroups?: string[]
  formulas?: { spells?: string[]; rituals?: string[]; preparations?: string[] }
  complexForms?: string[]
  powers?: PowerItem[]
  powerPointsKarma?: number
  spirits?: { key: string; type: string; services?: number }[]
  sprites?: { key: string; type: string; tasks?: number }[]
}

export const aspects = ['sorcery', 'conjuring', 'enchanting']
export const mentorAdvantages = ['magician', 'adept']
const limitIds = ['physical', 'mental', 'social']

// Campos de magia que cada despertar usa; o resto é magic.notAllowed.
export const magicFields: Record<string, string[]> = {
  magician: ['tradition', 'freeSkills', 'formulas', 'spirits'],
  'mystic-adept': [
    'tradition',
    'mentorAdvantage',
    'freeSkills',
    'formulas',
    'spirits',
    'powers',
    'powerPointsKarma',
  ],
  'aspected-magician': ['tradition', 'aspect', 'freeSkillGroups', 'formulas', 'spirits'],
  adept: ['freeSkills', 'powers'],
  technomancer: ['freeSkills', 'complexForms', 'sprites'],
}

const fieldOrder = [
  'tradition',
  'aspect',
  'mentorAdvantage',
  'freeSkills',
  'freeSkillGroups',
  'formulas',
  'complexForms',
  'powers',
  'powerPointsKarma',
  'spirits',
  'sprites',
]

export const formulaCount = (m: MagicData) =>
  (m.formulas?.spells?.length ?? 0) +
  (m.formulas?.rituals?.length ?? 0) +
  (m.formulas?.preparations?.length ?? 0)

function usedFields(m: MagicData): string[] {
  const used: Record<string, boolean> = {
    tradition: !!m.tradition,
    aspect: !!m.aspect,
    mentorAdvantage: !!m.mentorAdvantage,
    freeSkills: !!m.freeSkills?.length,
    freeSkillGroups: !!m.freeSkillGroups?.length,
    formulas: formulaCount(m) > 0,
    complexForms: !!m.complexForms?.length,
    powers: !!m.powers?.length,
    powerPointsKarma: (m.powerPointsKarma ?? 0) > 0,
    spirits: !!m.spirits?.length,
    sprites: !!m.sprites?.length,
  }
  return fieldOrder.filter((f) => used[f])
}

const has = (m: MagicData, field: string) =>
  magicFields[m.awakening ?? '']?.includes(field) ?? false
const powerRating = (p: PowerItem) => p.rating ?? 1

// Custo em pontos de poder: fixo, por nível, por nível em tabela ou por sentido.
export function powerCost(p: AdeptPower, rating: number): number {
  const c = p.powerPoints
  if (typeof c === 'number') return c
  if ('perLevel' in c) return c.perLevel * rating
  if ('byLevel' in c) return rating >= 1 && rating <= c.byLevel.length ? c.byLevel[rating - 1]! : 0
  return c.each * rating
}

// O que a letra de magia dá ao despertar escolhido.
export function magicEntry(l: Lookup, d: Sheet): MagicEntry | undefined {
  const row = l.priorities.get(d.priorities?.magic ?? '')
  return row?.magic.find((e) => e.awakening === d.magic?.awakening)
}

// Valor de Magia ou Ressonância antes dos pontos e do carma; undefined sem o despertar.
export function specialBase(l: Lookup, d: Sheet, attr: string): number | undefined {
  if (l.awakenings.get(d.magic?.awakening ?? '') !== attr) return undefined
  return magicEntry(l, d)?.attribute.value ?? 0
}

// Níveis que a prioridade dá às perícias escolhidas.
export function freeRatings(l: Lookup, d: Sheet): Record<string, number> {
  const r: Record<string, number> = {}
  const e = magicEntry(l, d)
  if (!e) return r
  if (e.skills) for (const id of d.magic?.freeSkills ?? []) r[id] = (r[id] ?? 0) + e.skills.rating
  if (e.skillGroups) {
    for (const g of d.magic?.freeSkillGroups ?? []) {
      for (const id of l.groups.get(g) ?? []) r[id] = (r[id] ?? 0) + e.skillGroups.rating
    }
  }
  return r
}

export function hasAstralPerception(d: Sheet): boolean {
  const a = d.magic?.awakening
  if (a === 'magician' || a === 'aspected-magician') return true
  if (a === 'adept' || a === 'mystic-adept')
    return !!d.magic?.powers?.some((p) => p.id === 'astral-perception')
  return false
}

type Budget = { total: number; spent: number }

// Orçamentos de magia e o carma que eles gastam.
export function magicCosts(
  l: Lookup,
  mech: Mechanics,
  d: Sheet,
  natural: Record<string, number>,
  budgets: Record<string, Budget>,
): number {
  const m = d.magic ?? {}
  const p = mech.creation.purchases
  const e = magicEntry(l, d)
  let karma = 0
  const formulas = formulaCount(m)
  if (has(m, 'formulas') || formulas > 0) {
    budgets.formulas = { total: e?.formulas ?? 0, spent: formulas }
    karma += Math.max(0, formulas - (e?.formulas ?? 0)) * p.spell.karma
  }
  const forms = m.complexForms?.length ?? 0
  if (m.awakening === 'technomancer' || forms > 0) {
    budgets.complexForms = { total: e?.complexForms ?? 0, spent: forms }
    karma += Math.max(0, forms - (e?.complexForms ?? 0)) * p.complexForm.karma
  }
  if (m.awakening === 'adept' || m.awakening === 'mystic-adept') {
    const spent = (m.powers ?? []).reduce((t, it) => {
      const pw = l.powers.get(it.id)
      return pw ? t + powerCost(pw, powerRating(it)) : t
    }, 0)
    const total = m.awakening === 'adept' ? (natural.mag ?? 0) : (m.powerPointsKarma ?? 0)
    budgets.powerPoints = { total, spent }
  }
  karma += (m.powerPointsKarma ?? 0) * p.powerPoint.karma
  for (const x of m.spirits ?? []) karma += (x.services ?? 0) * p.boundSpiritService.karma
  for (const x of m.sprites ?? []) karma += (x.tasks ?? 0) * p.registeredSpriteTask.karma
  return karma
}

function parameterAllowed(l: Lookup, pw: AdeptPower, value: string): boolean {
  const p = pw.parameter!
  let pool: string[] = []
  if (p.kind === 'attribute') pool = p.options ?? []
  else if (p.kind === 'limit') pool = limitIds
  else if (p.kind === 'skill') {
    pool =
      p.options ??
      [...l.skills.values()].filter((s) => p.categories?.includes(s.category)).map((s) => s.id)
  }
  return pool.includes(value) && !p.except?.includes(value)
}

function strictFreeSkills(l: Lookup, d: Sheet, e: MagicEntry): Violation[] {
  const vs: Violation[] = []
  const m = d.magic ?? {}
  const aspected = m.awakening === 'aspected-magician'
  const rule = aspected ? e.skillGroups : e.skills
  const chosen = (aspected ? m.freeSkillGroups : m.freeSkills) ?? []
  const field = aspected ? 'freeSkillGroups' : 'freeSkills'
  const expected = rule?.count ?? 0
  if (chosen.length !== expected) {
    vs.push(violation(`magic.${field}`, 'magic.freeSkillsCount', { expected, got: chosen.length }))
  }
  if (!rule) return vs
  for (const id of chosen) {
    let ok = true
    if (aspected) ok = !!rule.from.groups?.includes(id) && (!m.aspect || id === m.aspect)
    else {
      const sk = l.skills.get(id)
      if (rule.from.attribute) ok = sk?.attribute === rule.from.attribute
      else if (rule.from.groups) ok = rule.from.groups.includes(sk?.group ?? '')
    }
    if (!ok) vs.push(violation(`magic.${field}`, 'magic.freeSkillNotAllowed', { skill: id }))
  }
  return vs
}

export function strictMagic(
  l: Lookup,
  mech: Mechanics,
  d: Sheet,
  natural: Record<string, number>,
  env: Env,
): Violation[] {
  const vs: Violation[] = []
  const m = d.magic ?? {}
  const add = (path: string, code: string, params: Record<string, unknown>) =>
    vs.push(violation(path, code, params))
  if (!m.awakening) {
    for (const f of usedFields(m))
      add(`magic.${f}`, 'magic.notAllowed', { field: f, awakening: '' })
    return vs
  }
  const e = magicEntry(l, d)
  const letter = d.priorities?.magic
  if (letter && !e)
    add('magic.awakening', 'magic.notAtPriority', { awakening: m.awakening, priority: letter })
  if (['magician', 'mystic-adept', 'aspected-magician'].includes(m.awakening) && !m.tradition) {
    add('magic.tradition', 'required', { field: 'magic.tradition' })
  }
  if (m.awakening === 'aspected-magician' && !m.aspect) {
    add('magic.aspect', 'required', { field: 'magic.aspect' })
  }
  const mentor = d.qualities?.some((q) => q.id === 'mentor-spirit')
  if (m.awakening === 'mystic-adept' && mentor && !m.mentorAdvantage) {
    add('magic.mentorAdvantage', 'required', { field: 'magic.mentorAdvantage' })
  }
  for (const f of usedFields(m)) {
    if (!has(m, f)) add(`magic.${f}`, 'magic.notAllowed', { field: f, awakening: m.awakening })
  }
  if (e) vs.push(...strictFreeSkills(l, d, e))

  if (has(m, 'formulas')) {
    const limit = Math.trunc(evalOr(mech.creation.purchases.spell.max, env))
    for (const group of ['spells', 'rituals', 'preparations'] as const) {
      if ((m.formulas?.[group]?.length ?? 0) > limit) {
        add(`magic.formulas.${group}`, 'magic.formulasMax', { group, max: limit })
      }
    }
  }
  if (has(m, 'complexForms')) {
    const limit = Math.trunc(evalOr(mech.creation.purchases.complexForm.max, env))
    if ((m.complexForms?.length ?? 0) > limit)
      add('magic.complexForms', 'magic.complexFormsMax', { max: limit })
  }
  if (has(m, 'powers')) {
    for (const it of m.powers ?? []) {
      const pw = l.powers.get(it.id)
      if (!pw) continue
      const p = `magic.powers[${it.key}]`
      if (typeof pw.powerPoints !== 'number') {
        const limit = Math.min(natural.mag ?? 0, pw.levels?.max ?? Infinity)
        if (powerRating(it) > limit)
          add(`${p}.rating`, 'magic.powerLevelMax', { power: it.id, max: limit })
      }
      if (!pw.parameter) continue
      if (!it.parameter) add(`${p}.parameter`, 'magic.parameterRequired', { power: it.id })
      else if (!parameterAllowed(l, pw, it.parameter)) {
        add(`${p}.parameter`, 'magic.parameterNotAllowed', {
          power: it.id,
          parameter: it.parameter,
        })
      }
    }
  }
  const cha = natural.cha ?? 0
  if (has(m, 'spirits') && (m.spirits?.length ?? 0) > cha)
    add('magic.spirits', 'magic.spiritsMax', { max: cha })
  if (has(m, 'sprites') && (m.sprites?.length ?? 0) > cha)
    add('magic.sprites', 'magic.spiritsMax', { max: cha })
  return vs
}

// Fórmula de limite que pode faltar no ambiente vale 0, como no core.
function evalOr(f: unknown, env: Env): number {
  try {
    return evaluate(f, env)
  } catch (e) {
    if (e instanceof ExprError) return 0
    throw e
  }
}

// Se o despertar pode ter nível numa perícia restrita.
export function restrictedAllowed(l: Lookup, d: Sheet, id: string): boolean {
  const category = l.skills.get(id)?.category
  const a = d.magic?.awakening
  if (category === 'magical') {
    if (a === 'magician' || a === 'mystic-adept') return true
    if (a === 'aspected-magician') return !!l.groups.get(d.magic?.aspect ?? '')?.includes(id)
  }
  if (category === 'resonance') return a === 'technomancer'
  return false
}
