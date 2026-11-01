import type { Summary, Violation } from '@/core/rules/system'

import { core } from './core'

export type SheetStatus = 'draft' | 'ready'

export interface CharacterListItem {
  id: string
  system: string
  systemVersion: string
  name: string
  createdAt: string
  updatedAt: string
  sheet: {
    id: string
    status: SheetStatus
    revision: number
    summary: Summary
    updatedAt: string
  }
}

export async function listCharacters() {
  return (await core.get<CharacterListItem[]>('/characters')).data
}

export interface Sheet {
  id: string
  characterId: string
  system: string
  systemVersion: string
  schemaVersion: number
  status: SheetStatus
  revision: number
  summary: Summary
  data: Record<string, unknown>
  updatedAt: string
  // Strict de uma ficha pronta: aviso, não bloqueia.
  warnings?: Violation[]
}

export async function createCharacter(system: string, systemVersion: string) {
  return (
    await core.post<{ character: CharacterListItem; sheet: Sheet }>('/characters', {
      system,
      systemVersion,
    })
  ).data
}

export async function getSheet(id: string) {
  return (await core.get<Sheet>(`/sheets/${id}`)).data
}

// If-Match com a revisão que o app tem: 409 se outra escrita chegou antes.
export async function putSheet(id: string, data: unknown, revision: number) {
  return (await core.put<Sheet>(`/sheets/${id}`, { data }, revision)).data
}
