import type { CharacterListItem } from '@/core/api/characters'

export function character(over: {
  id?: string
  system?: string
  systemVersion?: string
  name?: string
  status?: 'draft' | 'ready'
  updatedAt?: string
  summary?: Partial<CharacterListItem['sheet']['summary']>
}): CharacterListItem {
  const updatedAt = over.updatedAt ?? '2026-11-01T12:00:00Z'
  return {
    id: over.id ?? 'c1',
    system: over.system ?? 'shadowrun',
    systemVersion: over.systemVersion ?? '5e',
    name: over.name ?? '',
    createdAt: updatedAt,
    updatedAt,
    sheet: {
      id: `s-${over.id ?? 'c1'}`,
      status: over.status ?? 'draft',
      revision: 1,
      updatedAt,
      summary: { title: '', subtitle: 'Sem metatipo', ...over.summary },
    },
  }
}
