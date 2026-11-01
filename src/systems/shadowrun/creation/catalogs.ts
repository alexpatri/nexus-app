import { shallowRef } from 'vue'

import type { Metatype, PriorityRow } from '../rules/catalogs'

// Os catálogos que as telas leem, além do que as regras usam. Preenchido pelo
// world.rules antes de a criação abrir.
export interface UiCatalogs {
  columns: { id: string; name: string }[]
  rows: PriorityRow[]
  metatypes: Metatype[]
  attributes: { id: string; name: string; abbr: string; category: string }[]
  awakenings: { id: string; name: string }[]
}

export const uiCatalogs = shallowRef<UiCatalogs>()

export function useCatalogs(): UiCatalogs {
  if (!uiCatalogs.value) throw new Error('shadowrun: catálogos não carregados')
  return uiCatalogs.value
}
