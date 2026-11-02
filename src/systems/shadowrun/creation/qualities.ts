import type { Violation } from '@/core/rules/system'
import { choicesFor, qualityCost } from '../rules/qualities'
import type { QualityItem } from '../rules/validate'
import { nameOf, type UiCatalogs } from './catalogs'

export type UiQuality = UiCatalogs['qualities'][number]

const limitNames: Record<string, string> = {
  physical: 'Físico',
  mental: 'Mental',
  social: 'Social',
}

// Ids possíveis do choice, com o nome para a tela.
export function choiceOptions(
  c: UiCatalogs,
  q: UiQuality,
): { id: string; name: string }[] | undefined {
  const ids = choicesFor(c.lookup, q)
  if (!ids) return undefined
  const sel = q.modifiers?.find((m) => typeof m.of === 'object')?.of
  const kind = q.choice ?? (typeof sel === 'object' ? sel.choose : '')
  const source: Record<string, { id: string; name: string }[]> = {
    skill: c.skills,
    attribute: c.attributes,
    'mentors.json#mentors': c.mentors,
    'traditions.json#spiritTypes': c.spiritTypes,
  }
  return ids.map((id) => ({
    id,
    name: kind === 'limit' ? limitNames[id]! : nameOf(source[kind] ?? [], id),
  }))
}

// Preço como a lista mostra: fixo, por nível ou faixa das opções.
export function priceOf(q: UiQuality): { text: string; min: number } {
  const cost = qualityCost(q)
  if (cost.perLevel) return { text: `${cost.perLevel} por nível`, min: cost.perLevel }
  const ranges = cost.options
    ? [cost.options.map((o) => o.karma)]
    : (cost.sum?.map((g) => g.options.map((o) => o.karma)) ?? [])
  if (ranges.length === 0) return { text: String(cost.fixed), min: cost.fixed }
  const min = ranges.reduce((t, r) => t + Math.min(...r), 0)
  const max = ranges.reduce((t, r) => t + Math.max(...r), 0)
  return { text: `${min} a ${max}`, min }
}

// O que a linha da qualidade comprada diz abaixo do nome.
export function detailOf(c: UiCatalogs, q: UiQuality, it: QualityItem): string {
  const parts: string[] = []
  if (q.levels) parts.push(`Nível ${it.rating ?? 1} de ${q.levels.max}`)
  const cost = qualityCost(q)
  const opt = (q.karma as { options?: { id: string; name?: string }[] }).options
  if (cost.options) parts.push(opt?.find((o) => o.id === it.option)?.name ?? 'Opção a escolher')
  if (cost.sum) {
    const groups = (q.karma as { sum: { id: string; options: { id: string; name?: string }[] }[] })
      .sum
    const names = groups.map((g) => g.options.find((o) => o.id === it.options?.[g.id])?.name)
    parts.push(names.every(Boolean) ? names.join(', ') : 'Opções a escolher')
  }
  const choices = choiceOptions(c, q)
  if (choices) parts.push(choices.find((x) => x.id === it.choice)?.name ?? 'Escolha a fazer')
  if (it.notes) parts.push(it.notes)
  return parts.join('; ') || 'Sem nível'
}

// Mensagem de uma violação de qualidade, com nomes do catálogo.
export function qualityMessage(c: UiCatalogs, v: Violation, metatype?: string): string {
  const q = nameOf(c.qualities, v.params?.quality as string)
  switch (v.code) {
    case 'qualities.levelOutOfRange':
      return `${q}: o nível vai de 1 a ${v.params?.max}.`
    case 'qualities.optionRequired':
      return `${q}: escolha uma opção.`
    case 'qualities.choiceRequired':
      return `${q}: falta escolher o alvo.`
    case 'qualities.choiceNotAllowed':
      return `${q}: essa escolha não vale para esta qualidade.`
    case 'qualities.duplicate':
      return `${q} aparece duas vezes com a mesma escolha.`
    case 'qualities.unique':
      return `${q} só pode aparecer uma vez.`
    case 'qualities.requirementNotMet':
      return v.params?.requirement === 'metatype'
        ? `${q} não vale para ${nameOf(c.metatypes, metatype).toLocaleLowerCase('pt-BR')}.`
        : `${q} é só para personagens despertos.`
    case 'budget.exceeded': {
      const side = v.params?.budget === 'positiveQualities' ? 'Positivas' : 'Negativas'
      return `${side} passam do limite de ${v.params?.total} em ${Number(v.params?.spent) - Number(v.params?.total)}.`
    }
  }
  return 'Há um problema nesta qualidade.'
}
