import type { Summary } from '@/core/rules/system'

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
