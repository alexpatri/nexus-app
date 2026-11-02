import type { Violation } from '@/core/rules/system'
import { nameOf, type UiCatalogs } from './catalogs'

const budgetNames: Record<string, string> = {
  skills: 'perícia',
  skillGroups: 'grupo de perícias',
  knowledge: 'conhecimento',
}

// Mensagem de uma violação de perícia, com nomes do catálogo.
export function skillMessage(c: UiCatalogs, v: Violation): string {
  const skill = v.params?.skill as string
  const s = nameOf(c.skills, skill)
  switch (v.code) {
    case 'skills.aboveMax':
      return `${s} ${v.params?.value} passa do máximo ${v.params?.max}.`
    case 'skills.restricted':
      return c.skills.find((x) => x.id === skill)?.category === 'resonance'
        ? `${s} é só para tecnomantes.`
        : `${s} é só para personagens despertos.`
    case 'skills.groupConflict':
      return `${s} é do grupo ${nameOf(c.groups, v.params?.group as string)}, já comprado: tire os pontos dela.`
    case 'skills.specializationNotAllowed':
      return `${s} é de grupo comprado e não aceita especialização.`
    case 'skills.nativeLanguageCount':
      return v.params?.got === 0
        ? 'Falta o idioma nativo.'
        : `O personagem tem ${v.params?.expected} idioma(s) nativo(s), não ${v.params?.got}.`
    case 'budget.exceeded': {
      const over = Number(v.params?.spent) - Number(v.params?.total)
      return `Os pontos de ${budgetNames[v.params?.budget as string] ?? 'perícia'} passam do orçamento em ${over}.`
    }
  }
  return 'Há um problema nas perícias.'
}

export function abbrOf(c: UiCatalogs, attr: string | undefined): string {
  return c.attributes.find((a) => a.id === attr)?.abbr ?? ''
}
