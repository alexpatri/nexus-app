import type { UiCatalogs } from './catalogs'

export const letters = ['A', 'B', 'C', 'D', 'E']

export type Priorities = Partial<Record<string, string>>

// Tocar numa letra livre a escolhe; numa usada em outra coluna, troca as duas;
// na escolhida, desfaz.
export function assign(current: Priorities, column: string, letter: string): Priorities {
  const next = { ...current }
  if (next[column] === letter) {
    delete next[column]
    return next
  }
  const holder = Object.keys(next).find((c) => next[c] === letter)
  if (holder) {
    if (next[column]) next[holder] = next[column]
    else delete next[holder]
  }
  next[column] = letter
  return next
}

const nuyen = new Intl.NumberFormat('pt-BR')

function list(items: string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ou ${items.at(-1)}`
}

const lower = (s: string) => s.toLocaleLowerCase('pt-BR')
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// O que a letra dá na coluna, lido de priorities.json.
export function describe(c: UiCatalogs, column: string, letter: string): string {
  const row = c.rows.find((r) => r.priority === letter)
  if (!row) return ''
  const name = (id: string, from: { id: string; name: string }[]) =>
    lower(from.find((x) => x.id === id)?.name ?? id)
  switch (column) {
    case 'metatype': {
      const opts = row.metatype.map((m) => ({
        name: name(m.metatype, c.metatypes),
        points: m.specialPoints,
      }))
      const points = (n: number) => `${n} ${n === 1 ? 'ponto especial' : 'pontos especiais'}`
      if (opts.length === 1) return `Só ${opts[0]!.name}, com ${points(opts[0]!.points)}.`
      return upper(`${list(opts.map((o) => `${o.name} ${o.points}`))} pontos especiais.`)
    }
    case 'attributes':
      return `${row.attributes} pontos de atributo.`
    case 'magic': {
      if (row.magic.length === 0) return 'Mundano: sem magia nem ressonância.'
      const byValue = new Map<number, string[]>()
      for (const m of row.magic) {
        byValue.set(m.attribute.value, [
          ...(byValue.get(m.attribute.value) ?? []),
          name(m.awakening, c.awakenings),
        ])
      }
      return upper([...byValue].map(([value, names]) => `${list(names)} ${value}`).join('; ') + '.')
    }
    case 'skills':
      return row.skills.groupPoints > 0
        ? `${row.skills.points} pontos de perícia e ${row.skills.groupPoints} de grupo.`
        : `${row.skills.points} pontos de perícia, sem pontos de grupo.`
    case 'resources':
      return `${nuyen.format(row.resources)} ¥`
  }
  return ''
}
