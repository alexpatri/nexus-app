import type { Violation } from '@/core/rules/system'
import type { AdeptPower, MagicEntry } from '../rules/catalogs'
import { nameOf, type UiCatalogs } from './catalogs'

const num = (x: number) => String(x).replace('.', ',')

// O que a letra de magia dá a um despertar, em uma frase.
export function givesOf(e: MagicEntry): string {
  const attr = e.attribute.id === 'res' ? 'Ressonância' : 'Magia'
  const parts = [`${attr} ${e.attribute.value}`]
  if (e.formulas) parts.push(`${e.formulas} fórmulas gratuitas`)
  if (e.complexForms) parts.push(`${e.complexForms} formas complexas`)
  if (e.skills) {
    const { count, rating, from } = e.skills
    const [one, many] =
      from.kind === 'active'
        ? ['perícia ativa', 'perícias ativas']
        : e.attribute.id === 'res'
          ? ['perícia de ressonância', 'perícias de ressonância']
          : ['perícia mágica', 'perícias mágicas']
    parts.push(`${count === 1 ? `uma ${one}` : `${count} ${many}`} no nível ${rating}`)
  }
  if (e.skillGroups) parts.push(`um grupo mágico no nível ${e.skillGroups.rating}`)
  if (e.awakening === 'adept') parts.push(`${e.attribute.value} pontos de poder`)
  if (e.awakening === 'mystic-adept') parts.push('pontos de poder só com carma')
  return `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' e ' : ''}${parts.at(-1)}.`
}

export function powerPrice(p: AdeptPower): string {
  const c = p.powerPoints
  if (typeof c === 'number') return num(c)
  if ('perLevel' in c) return `${num(c.perLevel)} por nível`
  if ('byLevel' in c) return c.byLevel.map(num).join(' / ')
  return `${num(c.each)} por sentido`
}

const fieldNames: Record<string, string> = {
  tradition: 'Tradição',
  aspect: 'Aspecto',
  mentorAdvantage: 'Vantagem de mentor',
  freeSkills: 'Perícia dada',
  freeSkillGroups: 'Grupo dado',
  formulas: 'Fórmula',
  complexForms: 'Forma complexa',
  powers: 'Poder de adepto',
  powerPointsKarma: 'Ponto de poder comprado',
  spirits: 'Espírito',
  sprites: 'Sprite',
}

// Mensagem de uma violação de magia, com nomes do catálogo.
export function magicMessage(c: UiCatalogs, v: Violation): string {
  const p = v.params ?? {}
  const awakening = nameOf(c.awakenings, p.awakening as string)
  const power = nameOf(c.adeptPowers, p.power as string)
  switch (v.code) {
    case 'required':
      return (
        {
          'magic.tradition': 'Escolha a tradição.',
          'magic.aspect': 'Escolha o aspecto.',
          'magic.mentorAdvantage': 'Escolha a vantagem do espírito mentor.',
        }[p.field as string] ?? 'Falta uma escolha.'
      )
    case 'magic.notAtPriority':
      return `${awakening} não está na prioridade ${p.priority} de Magia.`
    case 'magic.notAllowed':
      return p.awakening
        ? `${fieldNames[p.field as string]} não vale para ${awakening.toLocaleLowerCase('pt-BR')}.`
        : `${fieldNames[p.field as string]} só vale para despertos.`
    case 'magic.freeSkillsCount':
      return `A prioridade dá ${p.expected} escolha(s); há ${p.got}.`
    case 'magic.freeSkillNotAllowed':
      return `${nameOf([...c.skills, ...c.groups], p.skill as string)} não pode ser dada por esta prioridade.`
    case 'magic.formulasMax':
      return `As fórmulas passam do máximo de ${p.max} (Magia × 2).`
    case 'magic.complexFormsMax':
      return `As formas complexas passam do máximo de ${p.max} (Ressonância × 2).`
    case 'magic.powerLevelMax':
      return `${power}: o nível vai até ${p.max}.`
    case 'magic.parameterRequired':
      return `${power}: escolha o alvo do poder.`
    case 'magic.parameterNotAllowed':
      return `${power}: esse alvo não vale para o poder.`
    case 'budget.exceeded':
      return `Os poderes passam dos pontos de poder em ${num(Number(p.spent) - Number(p.total))}.`
  }
  return 'Há um problema na magia.'
}
