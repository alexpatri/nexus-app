import type { Violation } from '@/core/rules/system'

// data já conferido pelo Lenient.
export interface Sheet {
  identity?: Record<string, string>
  priorities?: Record<string, string>
  metatype?: string
  attributes?: Record<string, { points?: number; karma?: number }>
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
  if (path.startsWith('attributes.') && path.endsWith('.karma')) return 'karma'
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

// Confere forma, ids e chaves. Seção que ainda não tem fatia é campo desconhecido.
export function lenient(data: unknown, metatypes: Map<string, unknown>): Violation[] {
  const vs: Violation[] = []
  object('', data, vs, (path, key, v) => {
    switch (key) {
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
        else if (!metatypes.has(v)) {
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
