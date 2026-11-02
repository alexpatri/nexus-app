import type { Violation } from '@/core/rules/system'
import type { Lookup } from './lookup'
import { aspects, type MagicData, mentorAdvantages } from './magic'
import { optionKarma, qualityCost } from './qualities'

// data já conferido pelo Lenient.
export interface Buy {
  points?: number
  karma?: number
}

export interface SkillBuy extends Buy {
  specialization?: { name: string; paidWith: 'points' | 'karma' }
}

export interface QualityItem {
  key: string
  id: string
  rating?: number
  option?: string
  options?: Record<string, string>
  choice?: string
  notes?: string
}

export interface Sheet {
  identity?: Record<string, string>
  priorities?: Record<string, string>
  metatype?: string
  attributes?: Record<string, Buy>
  qualities?: QualityItem[]
  magic?: MagicData
  skills?: {
    active?: Record<string, SkillBuy>
    groups?: Record<string, Buy>
    knowledge?: (SkillBuy & { key: string; name: string; category: string })[]
    languages?: (SkillBuy & { key: string; name: string; native?: boolean })[]
  }
}

// Atributos que a ficha compra, na ordem de attributes.json.
export const baseAttrs = ['bod', 'agi', 'rea', 'str', 'wil', 'log', 'int', 'cha']
export const specialAttrs = ['edg', 'mag', 'res']
export const columns = ['metatype', 'attributes', 'magic', 'skills', 'resources']
const identityFields = ['name', 'concept', 'ethnicity', 'age', 'sex', 'height', 'weight', 'notes']

const budgetSteps: Record<string, string> = {
  special: 'metatype',
  attributes: 'metatype',
  powerPoints: 'magic',
  positiveQualities: 'qualities',
  negativeQualities: 'qualities',
  skills: 'skills',
  skillGroups: 'skills',
  knowledge: 'skills',
  nuyen: 'resources',
  karmaToNuyen: 'resources',
  karma: 'karma',
  contacts: 'karma',
}

// stepOf é o passo de system.json onde o campo é editado.
export function stepOf(path: string): string {
  if (path === 'identity.concept') return 'concept'
  if (path.startsWith('identity')) return 'finishing'
  if ((path.startsWith('attributes.') || path.startsWith('skills.')) && path.endsWith('.karma')) {
    return 'karma'
  }
  if (/^magic\.(spirits|sprites|powerPointsKarma)/.test(path)) return 'karma'
  if (path.startsWith('magic')) return 'magic'
  if (path.startsWith('qualities')) return 'qualities'
  if (path.startsWith('skills')) return 'skills'
  if (
    path.startsWith('priorities') ||
    path.startsWith('metatype') ||
    path.startsWith('attributes')
  ) {
    return 'metatype'
  }
  if (path.startsWith('budgets.')) return budgetSteps[path.slice('budgets.'.length)] ?? ''
  if (path.startsWith('resources.startingNuyenRoll')) return 'final-calculations'
  if (path.startsWith('resources')) return 'resources'
  return 'concept'
}

export function violation(path: string, code: string, params?: Record<string, unknown>): Violation {
  return { step: stepOf(path), path, code, ...(params && { params }) }
}

function shape(path: string, expected: string) {
  return violation(path, 'shape.invalid', { expected })
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isInteger(v: unknown) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
}

const join = (path: string, key: string) => (path ? `${path}.${key}` : key)

// object confere que v é objeto e passa cada campo para field, que devolve
// false para campo que o formato não tem.
function object(
  path: string,
  v: unknown,
  vs: Violation[],
  field: (path: string, key: string, v: unknown) => boolean,
) {
  if (!isObject(v)) {
    vs.push(shape(path, 'object'))
    return
  }
  for (const k of Object.keys(v).sort()) {
    if (!field(join(path, k), k, v[k])) vs.push(shape(join(path, k), 'absent'))
  }
}

// Lista de itens com key: cada item é objeto, tem key string, e a key não se
// repete em nenhuma lista da ficha. item recebe o path do item ("lista[key]").
function list(
  path: string,
  v: unknown,
  vs: Violation[],
  keys: Set<string>,
  item: (path: string, m: Record<string, unknown>) => void,
) {
  if (!Array.isArray(v)) {
    vs.push(shape(path, 'array'))
    return
  }
  v.forEach((x: unknown, i) => {
    if (!isObject(x)) {
      vs.push(shape(`${path}[${i}]`, 'object'))
      return
    }
    if (typeof x.key !== 'string' || x.key === '') {
      vs.push(shape(`${path}[${i}].key`, 'string'))
      return
    }
    const p = `${path}[${x.key}]`
    if (keys.has(x.key)) vs.push(violation(p, 'key.duplicate', { key: x.key }))
    keys.add(x.key)
    item(p, x)
  })
}

function expectString(path: string, v: unknown, vs: Violation[]) {
  if (typeof v !== 'string') vs.push(shape(path, 'string'))
}

function expectInteger(path: string, v: unknown, vs: Violation[]) {
  if (!isInteger(v)) vs.push(shape(path, 'integer'))
}

const unknownId = (path: string, catalog: string, id: string) =>
  violation(path, 'catalog.unknownId', { catalog, id })

function lenientQualities(path: string, v: unknown, vs: Violation[], keys: Set<string>, l: Lookup) {
  list(path, v, vs, keys, (path, m) => {
    const id = typeof m.id === 'string' ? m.id : ''
    const q = l.qualities.get(id)
    const cost = q ? qualityCost(q) : undefined
    object(path, m, vs, (p, key, v) => {
      switch (key) {
        case 'key':
        case 'notes':
        case 'choice':
          expectString(p, v, vs)
          return true
        case 'id':
          if (typeof v !== 'string') vs.push(shape(p, 'string'))
          else if (!q) vs.push(unknownId(p, 'qualities', id))
          return true
        case 'rating':
          expectInteger(p, v, vs)
          return true
        case 'option':
          if (typeof v !== 'string') vs.push(shape(p, 'string'))
          else if (cost?.options && optionKarma(cost.options, v) === undefined) {
            vs.push(unknownId(p, 'qualityOptions', `${id}.${v}`))
          }
          return true
        case 'options':
          object(p, v, vs, (p, group, v) => {
            if (typeof v !== 'string') {
              vs.push(shape(p, 'string'))
              return true
            }
            const g = cost?.sum?.find((x) => x.id === group)
            if (!g) return !q
            if (optionKarma(g.options, v) === undefined) {
              vs.push(unknownId(p, 'qualityOptions', `${id}.${v}`))
            }
            return true
          })
          return true
      }
      return false
    })
    if (!('id' in m)) vs.push(shape(`${path}.id`, 'string'))
  })
}

function idList(path: string, v: unknown, vs: Violation[], catalog: string, known: string[]) {
  if (!Array.isArray(v)) {
    vs.push(shape(path, 'array'))
    return
  }
  for (const x of v) {
    if (typeof x !== 'string') vs.push(shape(path, 'string'))
    else if (!known.includes(x)) vs.push(unknownId(path, catalog, x))
  }
}

function lenientMagic(path: string, v: unknown, vs: Violation[], keys: Set<string>, l: Lookup) {
  const ids = (name: string) => l.magicIds.get(name) ?? []
  object(path, v, vs, (p, key, v) => {
    switch (key) {
      case 'awakening':
        if (typeof v !== 'string') vs.push(shape(p, 'string'))
        else if (!l.awakenings.has(v)) vs.push(unknownId(p, 'awakenings', v))
        return true
      case 'tradition':
        if (typeof v !== 'string') vs.push(shape(p, 'string'))
        else if (!ids('traditions').includes(v)) vs.push(unknownId(p, 'traditions', v))
        return true
      case 'aspect':
      case 'mentorAdvantage':
        if (!(key === 'aspect' ? aspects : mentorAdvantages).includes(v as string))
          vs.push(shape(p, key))
        return true
      case 'freeSkills':
        idList(p, v, vs, 'skills', [...l.skills.keys()])
        return true
      case 'freeSkillGroups':
        idList(p, v, vs, 'skillGroups', [...l.groups.keys()])
        return true
      case 'complexForms':
        idList(p, v, vs, 'complexForms', ids('complexForms'))
        return true
      case 'formulas':
        object(p, v, vs, (p, group, v) => {
          if (group !== 'spells' && group !== 'rituals' && group !== 'preparations') return false
          idList(p, v, vs, group, ids(group))
          return true
        })
        return true
      case 'powerPointsKarma':
        expectInteger(p, v, vs)
        return true
      case 'powers':
        list(p, v, vs, keys, (path, m) =>
          object(path, m, vs, (p, key, v) => {
            if (key === 'key' || key === 'parameter') expectString(p, v, vs)
            else if (key === 'id') {
              if (typeof v !== 'string') vs.push(shape(p, 'string'))
              else if (!l.powers.has(v)) vs.push(unknownId(p, 'adeptPowers', v))
            } else if (key === 'rating') expectInteger(p, v, vs)
            else return false
            return true
          }),
        )
        return true
      case 'spirits':
      case 'sprites': {
        const catalog = key === 'spirits' ? 'spiritTypes' : 'spriteTypes'
        const count = key === 'spirits' ? 'services' : 'tasks'
        list(p, v, vs, keys, (path, m) =>
          object(path, m, vs, (p, key, v) => {
            if (key === 'key') expectString(p, v, vs)
            else if (key === 'type') {
              if (typeof v !== 'string') vs.push(shape(p, 'string'))
              else if (!ids(catalog).includes(v)) vs.push(unknownId(p, catalog, v))
            } else if (key === count) expectInteger(p, v, vs)
            else return false
            return true
          }),
        )
        return true
      }
    }
    return false
  })
}

// Pontos, carma e especialização, comuns a todo tipo de perícia.
function skillField(p: string, key: string, v: unknown, vs: Violation[]): boolean {
  switch (key) {
    case 'points':
    case 'karma':
      expectInteger(p, v, vs)
      return true
    case 'specialization':
      object(p, v, vs, (p, key, v) => {
        if (key === 'name') expectString(p, v, vs)
        else if (key === 'paidWith') {
          if (v !== 'points' && v !== 'karma') vs.push(shape(p, 'paidWith'))
        } else return false
        return true
      })
      return true
  }
  return false
}

function lenientSkills(path: string, v: unknown, vs: Violation[], keys: Set<string>, l: Lookup) {
  object(path, v, vs, (path, key, v) => {
    switch (key) {
      case 'active':
        object(path, v, vs, (p, id, v) => {
          if (!l.skills.has(id)) vs.push(unknownId(p, 'skills', id))
          object(p, v, vs, (p, key, v) => skillField(p, key, v, vs))
          return true
        })
        return true
      case 'groups':
        object(path, v, vs, (p, id, v) => {
          if (!l.groups.has(id)) vs.push(unknownId(p, 'skillGroups', id))
          object(p, v, vs, (p, key, v) => {
            if (key !== 'points' && key !== 'karma') return false
            expectInteger(p, v, vs)
            return true
          })
          return true
        })
        return true
      case 'knowledge':
        list(path, v, vs, keys, (path, m) =>
          object(path, m, vs, (p, key, v) => {
            if (key === 'key' || key === 'name') expectString(p, v, vs)
            else if (key === 'category') {
              if (typeof v !== 'string') vs.push(shape(p, 'string'))
              else if (!l.knowledge.has(v)) vs.push(unknownId(p, 'knowledgeCategories', v))
            } else return skillField(p, key, v, vs)
            return true
          }),
        )
        return true
      case 'languages':
        list(path, v, vs, keys, (path, m) =>
          object(path, m, vs, (p, key, v) => {
            if (key === 'key' || key === 'name') expectString(p, v, vs)
            else if (key === 'native') {
              if (typeof v !== 'boolean') vs.push(shape(p, 'boolean'))
            } else return skillField(p, key, v, vs)
            return true
          }),
        )
        return true
    }
    return false
  })
}

// Confere forma, ids e chaves. Seção que ainda não tem fatia é campo desconhecido.
export function lenient(data: unknown, l: Lookup): Violation[] {
  const vs: Violation[] = []
  const keys = new Set<string>()
  object('', data, vs, (path, key, v) => {
    switch (key) {
      case 'magic':
        lenientMagic(path, v, vs, keys, l)
        return true
      case 'qualities':
        lenientQualities(path, v, vs, keys, l)
        return true
      case 'skills':
        lenientSkills(path, v, vs, keys, l)
        return true
      case 'identity':
        object(path, v, vs, (path, key, v) => {
          if (!identityFields.includes(key)) return false
          if (typeof v !== 'string') vs.push(shape(path, 'string'))
          return true
        })
        return true
      case 'priorities':
        object(path, v, vs, (path, key, v) => {
          if (!columns.includes(key)) return false
          if (typeof v !== 'string' || v.length !== 1 || !'ABCDE'.includes(v)) {
            vs.push(shape(path, 'priority'))
          }
          return true
        })
        return true
      case 'metatype':
        if (typeof v !== 'string') vs.push(shape(path, 'string'))
        else if (!l.metatypes.has(v)) {
          vs.push(violation(path, 'catalog.unknownId', { catalog: 'metatypes', id: v }))
        }
        return true
      case 'attributes':
        object(path, v, vs, (path, key, v) => {
          if (!baseAttrs.includes(key) && !specialAttrs.includes(key)) return false
          object(path, v, vs, (path, key, v) => {
            if (key !== 'points' && key !== 'karma') return false
            if (!isInteger(v)) vs.push(shape(path, 'integer'))
            return true
          })
          return true
        })
        return true
    }
    return false
  })
  return vs
}
