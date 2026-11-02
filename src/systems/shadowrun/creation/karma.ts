import { evaluate } from '@/core/rules/expr'
import type { Violation } from '@/core/rules/system'
import { nameOf, type UiCatalogs } from './catalogs'
import { skillMessage } from './skills'

// Carma de subir n degraus a partir de from, com a fórmula de progression.costs.
export function stepsCost(formula: unknown, from: number, n: number): number {
  let total = 0
  for (let r = from + 1; r <= from + n; r++) total += evaluate(formula, { rating: r })
  return total
}

const fields: Record<string, string> = { connection: 'Conexão', loyalty: 'Lealdade' }

// Mensagem de uma violação do passo de carma, com nomes do catálogo.
export function karmaMessage(c: UiCatalogs, v: Violation): string {
  const p = v.params ?? {}
  switch (v.code) {
    case 'budget.exceeded':
      return `O carma gasto passa do total em ${Number(p.spent) - Number(p.total)}.`
    case 'attributes.aboveMax':
      return `${nameOf(c.attributes, String(p.attribute))} ${p.value} passa do máximo ${p.max}.`
    case 'attributes.notAllowed':
      return `${nameOf(c.attributes, String(p.attribute))} não vale para este personagem.`
    case 'contacts.costOutOfRange':
      return `Cada contato custa de ${p.min} a ${p.max} de carma (Conexão + Lealdade).`
    case 'contacts.ratingOutOfRange':
      return `${fields[String(p.field)]} vai de ${p.min} a ${p.max}.`
    case 'magic.spiritsMax':
      return `O personagem só pode ter ${p.max} espíritos ou sprites (o Carisma).`
    case 'magic.notAllowed':
      return 'Este personagem não vincula espíritos nem registra sprites desse tipo.'
  }
  if (v.code.startsWith('skills.')) return skillMessage(c, v)
  return 'Há um problema no carma.'
}
