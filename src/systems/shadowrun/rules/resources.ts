import { evaluate } from '@/core/rules/expr'
import type { Violation } from '@/core/rules/system'
import type {
  Augmentation,
  AugPart,
  Availability,
  Capacity,
  CatalogRef,
  GearModifier,
  Mechanics,
  RatingRange,
} from './catalogs'
import type { Lookup } from './lookup'
import {
  expectInteger,
  expectString,
  isObject,
  list,
  object,
  shape,
  type Sheet,
  unknownId,
  violation,
} from './validate'

export interface AugItem {
  key: string
  id: string
  grade?: string
  rating?: number
  variant?: string
  parameter?: string
  installedIn?: string
}

export interface ResourcesData {
  karmaToNuyen?: number
  startingNuyenRoll?: number
  lifestyles?: { key: string; id: string; months?: number; primary?: boolean; options?: string[] }[]
  identities?: {
    key: string
    name?: string
    rating?: number
    licenses?: { key: string; name?: string; rating?: number }[]
  }[]
  weapons?: { key: string; id: string; rating?: number; quantity?: number }[]
  armor?: {
    key: string
    id: string
    cost?: number
    options?: string[]
    modifications?: { key: string; id: string; rating?: number }[]
  }[]
  augmentations?: AugItem[]
  devices?: {
    key: string
    kind: 'commlink' | 'cyberdeck'
    id: string
    options?: string[]
    array?: Record<string, number>
    programs?: string[]
  }[]
  vehicles?: { key: string; id: string }[]
  other?: { key: string; name?: string; cost?: number; quantity?: number }[]
}

const deviceKinds = ['commlink', 'cyberdeck']
export const deckAttrs = ['attack', 'sleaze', 'dataProcessing', 'firewall']

export function lenientResources(
  path: string,
  v: unknown,
  vs: Violation[],
  keys: Set<string>,
  l: Lookup,
) {
  const g = l.gear
  const idField = (p: string, v: unknown, catalog: string, known: boolean) => {
    if (typeof v !== 'string') vs.push(shape(p, 'string'))
    else if (!known) vs.push(unknownId(p, catalog, v))
  }
  const str = (m: Record<string, unknown>, k: string) => (typeof m[k] === 'string' ? m[k] : '')
  // fields devolve false para campo que o item não tem; com m ausente,
  // pergunta só se o item pede id.
  type Fields = (p: string, key: string, v: unknown, m?: Record<string, unknown>) => boolean
  const items = (p: string, v: unknown, fields: Fields) =>
    list(p, v, vs, keys, (path, m) => {
      object(path, m, vs, (p, key, v) => key === 'key' || fields(p, key, v, m))
      if (!('id' in m) && fields(`${path}.id`, 'id', undefined))
        vs.push(shape(`${path}.id`, 'string'))
    })
  // prefix vai antes do id quando a opção é do próprio item ("<item>.<opção>").
  const ids = (
    p: string,
    v: unknown,
    catalog: string,
    prefix: string,
    known: (id: string) => boolean,
  ) => {
    if (!Array.isArray(v)) {
      vs.push(shape(p, 'array'))
      return
    }
    for (const x of v) {
      if (typeof x !== 'string') vs.push(shape(p, 'string'))
      else if (!known(x)) vs.push(unknownId(p, catalog, prefix + x))
    }
  }
  const rated = (p: string, key: string, v: unknown, extra: Record<string, () => void> = {}) => {
    if (key in extra) extra[key]!()
    else if (key === 'name') expectString(p, v, vs)
    else if (key === 'rating') expectInteger(p, v, vs)
    else return false
    return true
  }

  object(path, v, vs, (p, key, v) => {
    switch (key) {
      case 'karmaToNuyen':
      case 'startingNuyenRoll':
        expectInteger(p, v, vs)
        return true
      case 'lifestyles':
        items(p, v, (p, key, v, m) => {
          if (key === 'id') {
            if (m) idField(p, v, 'lifestyles', g.lifestyles.has(str(m, 'id')))
          } else if (key === 'months') expectInteger(p, v, vs)
          else if (key === 'primary') {
            if (typeof v !== 'boolean') vs.push(shape(p, 'boolean'))
          } else if (key === 'options')
            ids(p, v, 'lifestyleOptions', '', (id) => g.lifeOptions.has(id))
          else return false
          return true
        })
        return true
      case 'identities':
        items(p, v, (p, key, v) =>
          rated(p, key, v, {
            licenses: () => items(p, v, (p, key, v) => rated(p, key, v)),
          }),
        )
        return true
      case 'weapons':
        items(p, v, (p, key, v, m) => {
          if (key === 'id') {
            if (m) idField(p, v, 'weapons', g.weapons.has(str(m, 'id')))
          } else if (key === 'rating' || key === 'quantity') expectInteger(p, v, vs)
          else return false
          return true
        })
        return true
      case 'armor':
        items(p, v, (p, key, v, m) => {
          if (!m) return true
          const a = g.armor.get(str(m, 'id'))
          if (key === 'id') idField(p, v, 'armor', !!a)
          else if (key === 'cost') expectInteger(p, v, vs)
          else if (key === 'options') {
            ids(
              p,
              v,
              'armorOptions',
              a ? `${a.id}.` : '',
              (id) => !a || !!a.options?.some((o) => o.id === id),
            )
          } else if (key === 'modifications') {
            items(p, v, (p, key, v, m) => {
              if (key === 'id') {
                if (m) idField(p, v, 'armorModifications', g.armorMods.has(str(m, 'id')))
              } else if (key === 'rating') expectInteger(p, v, vs)
              else return false
              return true
            })
          } else return false
          return true
        })
        return true
      case 'augmentations':
        items(p, v, (p, key, v, m) => {
          if (!m) return true
          const a = g.augmentations.get(str(m, 'id'))
          if (key === 'id') idField(p, v, 'augmentations', !!a)
          else if (key === 'grade') idField(p, v, 'grades', g.grades.has(str(m, 'grade')))
          else if (key === 'rating') expectInteger(p, v, vs)
          else if (key === 'variant') {
            if (typeof v === 'string' && a && !a.variants?.some((x) => x.id === v)) {
              vs.push(unknownId(p, 'augmentationVariants', `${a.id}.${v}`))
            } else expectString(p, v, vs)
          } else if (key === 'parameter' || key === 'installedIn') expectString(p, v, vs)
          else return false
          return true
        })
        return true
      case 'devices':
        items(p, v, (p, key, v, m) => {
          if (!m) return true
          const kind = str(m, 'kind')
          if (key === 'kind') {
            if (!deviceKinds.includes(kind)) vs.push(shape(p, 'deviceKind'))
          } else if (key === 'id') {
            if (kind === 'commlink') idField(p, v, 'commlinks', g.commlinks.has(str(m, 'id')))
            else if (kind === 'cyberdeck')
              idField(p, v, 'cyberdecks', g.cyberdecks.has(str(m, 'id')))
            else expectString(p, v, vs)
          } else if (key === 'options' && kind === 'commlink') {
            ids(p, v, 'commlinkOptions', '', (id) => g.linkOptions.has(id))
          } else if (key === 'programs' && kind === 'cyberdeck') {
            ids(p, v, 'programs', '', (id) => g.programs.has(id))
          } else if (key === 'array' && kind === 'cyberdeck') {
            object(p, v, vs, (p, key, v) => {
              if (!deckAttrs.includes(key)) return false
              expectInteger(p, v, vs)
              return true
            })
          } else return false
          return true
        })
        return true
      case 'vehicles':
        items(p, v, (p, key, v, m) => {
          if (key !== 'id') return false
          if (m) idField(p, v, 'vehicles', g.vehicles.has(str(m, 'id')))
          return true
        })
        return true
      case 'other':
        items(p, v, (p, key, v) => {
          if (key === 'name') expectString(p, v, vs)
          else if (key === 'cost' || key === 'quantity') expectInteger(p, v, vs)
          else return false
          return true
        })
        return true
    }
    return false
  })
}

const isExpr = (v: unknown) => isObject(v) && ('op' in v || 'ref' in v)

// Número ou fórmula com rating; o que não é nenhum dos dois vale 0.
function gearEval(f: unknown, rating: number): number {
  if (typeof f === 'number') return f
  if (!isExpr(f)) return 0
  return evaluate(f, { rating })
}

// Preço de catálogo: número, fórmula, { add }, { value } ou o mínimo da faixa.
export function price(cost: unknown, rating: number): number {
  if (isObject(cost) && !isExpr(cost)) {
    for (const k of ['add', 'value', 'min']) if (k in cost) return gearEval(cost[k], rating)
    return 0
  }
  return gearEval(cost, rating)
}

function costRange(cost: unknown): { min: number; max: number } | undefined {
  if (isObject(cost) && typeof cost.min === 'number' && typeof cost.max === 'number') {
    return { min: cost.min, max: cost.max }
  }
  return undefined
}

export const ratingOf = (r: number | undefined, rng?: RatingRange) => r ?? rng?.min ?? 1

// Disponibilidade própria do item no nível.
export const availabilityOf = (a: Availability | null | undefined, rating: number) =>
  a ? gearEval(a.value, rating) : 0

// O item com o nível ou a variante escolhida por cima.
export function augPart(a: Augmentation, it: AugItem): AugPart {
  const p: AugPart = { ...a }
  const over = (x: AugPart) => {
    for (const k of ['essence', 'capacity', 'availability', 'cost', 'modifiers'] as const) {
      if (x[k] !== undefined && x[k] !== null) Object.assign(p, { [k]: x[k] })
    }
  }
  const r = ratingOf(it.rating, a.rating)
  for (const l of a.levels ?? []) if (l.rating === r) over(l)
  for (const v of a.variants ?? []) if (v.id === it.variant) over(v)
  return p
}

const capacityOf = (p: AugPart): Capacity => (isObject(p.capacity) ? p.capacity : {})

// O que os recursos somam na ficha.
export interface GearOut {
  nuyen: number
  essence: number // milésimos gastos
  bonus: Record<string, number>
  armor: number
  dice: number
  limit: Record<string, number>
  pool: Record<string, number>
  deckDP?: number
  // Nuyen e Essência (milésimos) de cada item, pela key, para a tela.
  items: Record<string, { nuyen: number; essence?: number }>
}

const ceilDiv = (num: number, den: number) => Math.ceil(num / den)
const hundredths = (x: number) => Math.round(x * 100)

export function gearCalc(l: Lookup, mech: Mechanics, d: Sheet): GearOut {
  const g = l.gear
  const res = d.resources ?? {}
  const out: GearOut = {
    nuyen: 0,
    essence: 0,
    bonus: {},
    armor: 0,
    dice: 0,
    limit: {},
    pool: {},
    items: {},
  }
  const spend = (key: string, n: number) => {
    out.nuyen += n
    const it = (out.items[key] ??= { nuyen: 0 })
    it.nuyen += n
  }
  const meta = d.metatype ? l.metatypes.get(d.metatype) : undefined
  const traitMods = meta?.traits.flatMap((t) => t.modifiers ?? []) ?? []

  const mults = traitMods
    .filter((m) => m.target === 'lifestyle.cost')
    .map((m) => hundredths(m.mul ?? 1))
  for (const ls of res.lifestyles ?? []) {
    let pct = 0
    let add = 0
    for (const o of ls.options ?? []) {
      pct += g.lifeOptions.get(o)?.percent ?? 0
      add += g.lifeOptions.get(o)?.add ?? 0
    }
    let num = (g.lifestyles.get(ls.id)?.cost ?? 0) * (100 + pct) + add * 100
    let den = 100
    for (const m of mults) {
      num *= m
      den *= 100
    }
    spend(ls.key, ceilDiv(num * (ls.months ?? 1), den))
  }
  const sin = g.identities.get('fake-sin')!
  const license = g.identities.get('fake-license')!
  for (const id of res.identities ?? []) {
    spend(id.key, price(sin.cost, ratingOf(id.rating, sin.rating)))
    for (const lc of id.licenses ?? [])
      spend(id.key, price(license.cost, ratingOf(lc.rating, license.rating)))
  }
  for (const w of res.weapons ?? []) {
    const it = g.weapons.get(w.id)
    if (it) spend(w.key, price(it.cost, ratingOf(w.rating, it.rating)) * (w.quantity ?? 1))
  }
  let worn = 0
  const best: Record<string, number> = { helmet: 0, shield: 0 }
  for (const a of res.armor ?? []) {
    const it = g.armor.get(a.id)
    if (!it) continue
    spend(a.key, costRange(it.cost) && a.cost !== undefined ? a.cost : price(it.cost, 1))
    let v = typeof it.armor === 'number' ? it.armor : 0
    for (const o of it.options ?? []) {
      if (!a.options?.includes(o.id)) continue
      spend(a.key, price(o.cost, 1))
      if (typeof o.armor === 'number') v = Math.max(v, o.armor)
      else if (o.armor) v += gearEval(o.armor.add, 1)
    }
    for (const m of a.modifications ?? []) {
      const mod = g.armorMods.get(m.id)
      if (mod) spend(a.key, price(mod.cost, ratingOf(m.rating, mod.rating)))
    }
    if (it.category === 'helmet' || it.category === 'shield') {
      const add = typeof it.armor === 'object' ? gearEval(it.armor.add, 1) : 0
      best[it.category] = Math.max(best[it.category]!, add)
    } else worn = Math.max(worn, v)
  }

  const apply = (ms: GearModifier[] | undefined, rating: number, parameter?: string) => {
    for (const m of ms ?? []) {
      const of = (m.of === 'parameter' ? parameter : m.of) ?? ''
      const v = () => gearEval(m.add, rating)
      if (m.target === 'attr') out.bonus[of] = (out.bonus[of] ?? 0) + v()
      else if (m.target === 'armor') out.armor += v()
      else if (m.target === 'initiative.dice') out.dice += v()
      else if (m.target === 'limit') out.limit[of] = (out.limit[of] ?? 0) + v()
      else if (m.target === 'skill.rating') out.pool[of] = (out.pool[of] ?? 0) + v()
    }
  }

  let lossMul = 100
  for (const it of d.qualities ?? []) {
    for (const m of l.qualities.get(it.id)?.modifiers ?? []) {
      if (m.target === 'essence.cyberwareLoss')
        lossMul = Math.trunc((lossMul * hundredths(m.mul ?? 1)) / 100)
    }
  }
  const standard = g.grades.get('standard')!
  for (const it of res.augmentations ?? []) {
    const a = g.augmentations.get(it.id)
    if (!a) continue
    const p = augPart(a, it)
    const r = ratingOf(it.rating, a.rating)
    const gr = g.grades.get(it.grade ?? '') ?? standard
    spend(it.key, ceilDiv(Math.round(price(p.cost, r)) * hundredths(gr.cost), 100))
    if (!it.installedIn && p.essence !== undefined && p.essence !== null) {
      const milli = Math.round(gearEval(p.essence, r) * 1000)
      const mul = a.type === 'cyberware' ? lossMul : 100
      const e = ceilDiv(milli * hundredths(gr.essence) * mul, 10000)
      out.essence += e
      out.items[it.key]!.essence = e
    }
    apply(p.modifiers, r, it.parameter)
  }
  for (const dv of res.devices ?? []) {
    if (dv.kind === 'commlink') {
      spend(dv.key, price(g.commlinks.get(dv.id)?.cost, 1))
      for (const o of dv.options ?? []) spend(dv.key, price(g.linkOptions.get(o)?.cost, 1))
    } else if (dv.kind === 'cyberdeck') {
      spend(dv.key, price(g.cyberdecks.get(dv.id)?.cost, 1))
      for (const pr of dv.programs ?? []) spend(dv.key, price(g.programs.get(pr)?.cost, 1))
      if (out.deckDP === undefined && dv.array) out.deckDP = dv.array.dataProcessing ?? 0
    }
  }
  for (const v of res.vehicles ?? []) spend(v.key, price(g.vehicles.get(v.id)?.cost, 1))
  for (const o of res.other ?? []) spend(o.key, (o.cost ?? 0) * (o.quantity ?? 1))
  for (const pw of d.magic?.powers ?? []) {
    apply(l.powers.get(pw.id)?.modifiers, pw.rating ?? 1, pw.parameter)
  }
  for (const m of traitMods) if (m.target === 'armor') out.armor += gearEval(m.add, 1)
  out.armor += worn + best.helmet! + best.shield!
  const cap = mech.augmentation.maxAttributeBonus
  for (const a of Object.keys(out.bonus)) out.bonus[a] = Math.min(out.bonus[a]!, cap)
  return out
}

const gearPath = (list: string, key: string, field = '') =>
  `resources.${list}[${key}]${field ? `.${field}` : ''}`

const excludes = (a: Augmentation, id: string) =>
  !!a.excludes?.some((r) => r.catalog === 'augmentations' && r.id === id)

function permutation(array: Record<string, number> | undefined, want: number[]) {
  if (!array) return false
  const got = deckAttrs.map((k) => array[k] ?? 0).sort((a, b) => a - b)
  const w = [...want].sort((a, b) => a - b)
  return got.length === w.length && got.every((x, i) => x === w[i])
}

// O primeiro estilo de vida primário da ficha.
export function startingLifestyle(l: Lookup, d: Sheet) {
  for (const ls of d.resources?.lifestyles ?? []) {
    const st = l.gear.lifestyles.get(ls.id)
    if (st && ls.primary) return st
  }
  return undefined
}

// Se o item de outro catálogo está na ficha.
export function present(d: Sheet, x: CatalogRef) {
  if (x.catalog === 'augmentations') return !!d.resources?.augmentations?.some((a) => a.id === x.id)
  if (x.catalog === 'adept-powers') return !!d.magic?.powers?.some((p) => p.id === x.id)
  return false
}

export function strictResources(
  l: Lookup,
  mech: Mechanics,
  d: Sheet,
  essence?: number,
): Violation[] {
  const g = l.gear
  const res = d.resources ?? {}
  const rules = mech.creation.resources
  const vs: Violation[] = []
  const add = (path: string, code: string, params?: Record<string, unknown>) =>
    vs.push(violation(path, code, params))
  const maxAv = rules.maxAvailability
  const avail = (path: string, item: string, value: number) => {
    if (value > maxAv) add(path, 'gear.availabilityMax', { item, availability: value, max: maxAv })
  }
  const rating = (path: string, item: string, r?: number, rng?: RatingRange) => {
    if (r !== undefined && rng && (r < rng.min || r > rng.max)) {
      add(path, 'gear.ratingOutOfRange', { item, min: rng.min, max: rng.max })
    }
  }
  const value = (a: Availability | null | undefined, r: number) => (a ? gearEval(a.value, r) : 0)
  const addOf = (a: Availability | null | undefined) => (a ? gearEval(a.add, 1) : 0)

  let primary = ''
  for (const ls of res.lifestyles ?? []) {
    const st = g.lifestyles.get(ls.id)
    if (!st) continue
    if (st.primary === false) {
      add(gearPath('lifestyles', ls.key), 'resources.lifestyleNotAllowed', { lifestyle: ls.id })
    }
    if (!ls.primary) continue
    if (primary) {
      add(gearPath('lifestyles', ls.key, 'primary'), 'resources.primaryLifestyleDuplicate')
      continue
    }
    primary = ls.id
  }
  if (!primary) add('resources.lifestyles', 'required', { field: 'resources.lifestyles' })
  if (res.startingNuyenRoll === undefined) {
    add('resources.startingNuyenRoll', 'required', { field: 'resources.startingNuyenRoll' })
  } else {
    const sn = g.lifestyles.get(primary)?.startingNuyen
    const r = res.startingNuyenRoll
    if (sn && (r < sn.dice || r > sn.dice * 6)) {
      add('resources.startingNuyenRoll', 'resources.startingRollOutOfRange', {
        min: sn.dice,
        max: sn.dice * 6,
      })
    }
  }

  const sin = g.identities.get('fake-sin')!
  const license = g.identities.get('fake-license')!
  for (const id of res.identities ?? []) {
    rating(gearPath('identities', id.key, 'rating'), sin.id, id.rating, sin.rating)
    avail(
      gearPath('identities', id.key),
      sin.id,
      value(sin.availability, ratingOf(id.rating, sin.rating)),
    )
    for (const lc of id.licenses ?? []) {
      const p = gearPath('identities', id.key, `licenses[${lc.key}]`)
      rating(`${p}.rating`, license.id, lc.rating, license.rating)
      avail(p, license.id, value(license.availability, ratingOf(lc.rating, license.rating)))
    }
  }
  for (const w of res.weapons ?? []) {
    const it = g.weapons.get(w.id)
    if (!it) continue
    rating(gearPath('weapons', w.key, 'rating'), w.id, w.rating, it.rating)
    avail(gearPath('weapons', w.key), w.id, value(it.availability, ratingOf(w.rating, it.rating)))
  }
  for (const a of res.armor ?? []) {
    const it = g.armor.get(a.id)
    if (!it) continue
    const p = gearPath('armor', a.key)
    const range = costRange(it.cost)
    if (range && a.cost !== undefined && (a.cost < range.min || a.cost > range.max)) {
      add(`${p}.cost`, 'gear.costOutOfRange', { item: a.id, min: range.min, max: range.max })
    }
    let av = value(it.availability, 1)
    for (const o of it.options ?? []) {
      if (!a.options?.includes(o.id)) continue
      av += addOf(o.availability)
      if (o.availability?.value !== undefined) avail(`${p}.options`, o.id, value(o.availability, 1))
    }
    avail(p, a.id, av)
    let used = 0
    for (const m of a.modifications ?? []) {
      const mod = g.armorMods.get(m.id)
      if (!mod) continue
      const mp = `${p}.modifications[${m.key}]`
      const r = ratingOf(m.rating, mod.rating)
      rating(`${mp}.rating`, m.id, m.rating, mod.rating)
      avail(mp, m.id, value(mod.availability, r))
      used += gearEval(mod.capacity.cost, r)
    }
    if (used > it.capacity)
      add(p, 'gear.capacityExceeded', { item: a.id, capacity: it.capacity, used })
  }

  const augs = res.augmentations ?? []
  const hosts = new Map(augs.map((it) => [it.key, it]))
  const used = new Map<string, number>()
  const standard = g.grades.get('standard')!
  augs.forEach((it, i) => {
    const a = g.augmentations.get(it.id)
    if (!a) return
    const p = augPart(a, it)
    const r = ratingOf(it.rating, a.rating)
    const path = gearPath('augmentations', it.key)
    rating(`${path}.rating`, it.id, it.rating, a.rating)
    const gr = g.grades.get(it.grade ?? '') ?? standard
    if (it.grade && !rules.grades.includes(it.grade)) {
      add(`${path}.grade`, 'gear.gradeNotAllowed', { item: it.id, grade: it.grade })
    }
    avail(path, it.id, value(p.availability, r) + gr.availability)
    if ((a.variants?.length ?? 0) > 0 && !it.variant)
      add(`${path}.variant`, 'gear.variantRequired', { item: it.id })
    if (a.parameter) {
      if (!it.parameter) add(`${path}.parameter`, 'gear.parameterRequired', { item: it.id })
      else if (a.parameter.kind === 'skill' && !l.skills.has(it.parameter)) {
        add(`${path}.parameter`, 'gear.parameterNotAllowed', {
          item: it.id,
          parameter: it.parameter,
        })
      }
    }
    const cp = capacityOf(p)
    if (it.installedIn) {
      const host = hosts.get(it.installedIn)
      const ha = host && g.augmentations.get(host.id)
      const provides = ha && capacityOf(augPart(ha, host)).provides
      if (
        !host ||
        !ha ||
        provides === undefined ||
        cp.cost === undefined ||
        !capacityOf(ha).accepts?.includes(a.category)
      ) {
        add(`${path}.installedIn`, 'gear.notInstallable', { item: it.id })
      } else used.set(host.key, (used.get(host.key) ?? 0) + gearEval(cp.cost, r))
    } else if ((p.essence === undefined || p.essence === null) && cp.cost !== undefined) {
      add(path, 'gear.hostRequired', { item: it.id })
    }
    for (const prev of augs.slice(0, i)) {
      const pa = g.augmentations.get(prev.id)
      if (!pa) continue
      if (excludes(a, prev.id) || excludes(pa, it.id))
        add(path, 'gear.excluded', { item: it.id, with: prev.id })
      if (a.unique && prev.id === it.id && (prev.parameter ?? '') === (it.parameter ?? '')) {
        add(path, 'gear.duplicate', { item: it.id })
      }
    }
  })
  for (const [key, n] of used) {
    const host = hosts.get(key)!
    const provides = capacityOf(augPart(g.augmentations.get(host.id)!, host)).provides!
    if (n > provides) {
      add(gearPath('augmentations', key), 'gear.capacityExceeded', {
        item: host.id,
        capacity: provides,
        used: n,
      })
    }
  }

  for (const dv of res.devices ?? []) {
    const p = gearPath('devices', dv.key)
    const it = dv.kind === 'commlink' ? g.commlinks.get(dv.id) : g.cyberdecks.get(dv.id)
    if (!it) continue
    if (it.deviceRating > rules.maxDeviceRating) {
      add(p, 'gear.deviceRatingMax', { item: dv.id, max: rules.maxDeviceRating })
    }
    let av = value(it.availability, 1)
    for (const o of dv.options ?? []) av += addOf(g.linkOptions.get(o)?.availability)
    avail(p, dv.id, av)
    for (const pr of dv.programs ?? [])
      avail(`${p}.programs`, pr, value(g.programs.get(pr)?.availability, 1))
    if (dv.kind === 'cyberdeck' && !permutation(dv.array, it.attributeArray ?? [])) {
      add(`${p}.array`, 'gear.deckArrayInvalid', { item: dv.id })
    }
  }
  for (const v of res.vehicles ?? []) {
    const it = g.vehicles.get(v.id)
    if (it) avail(gearPath('vehicles', v.key), v.id, value(it.availability, 1))
  }
  if (essence !== undefined && essence <= 0)
    add('resources.augmentations', 'essence.depleted', { essence })
  return vs
}
