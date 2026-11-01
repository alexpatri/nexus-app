import type { CharacterListItem } from '@/core/api/characters'

// Rascunhos primeiro, depois prontas; dentro de cada grupo, o mais recente.
export function sortForList(items: CharacterListItem[]): CharacterListItem[] {
  const rank = (c: CharacterListItem) => (c.sheet.status === 'draft' ? 0 : 1)
  return [...items].sort(
    (a, b) => rank(a) - rank(b) || Date.parse(b.sheet.updatedAt) - Date.parse(a.sheet.updatedAt),
  )
}
