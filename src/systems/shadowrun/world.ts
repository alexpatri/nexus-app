import type { CatalogLoader } from '@/core/catalog/loader'
import type { SystemWorld } from '@/systems'
import './creation/inks.css'
import CreationFlow from './creation/CreationFlow.vue'
import { type UiCatalogs, uiCatalogs } from './creation/catalogs'
import type { Catalogs } from './rules/catalogs'
import { createShadowrun } from './rules'
import { shadowrunTheme } from './theme'

async function rules(loader: CatalogLoader) {
  const names = ['system', 'metatypes', 'priorities', 'mechanics', 'attributes', 'awakening']
  const [system, metatypes, priorities, mechanics, attributes, awakening] = await Promise.all(
    names.map((name) => loader.catalog('shadowrun', '5e', name)),
  )
  // A mesa pode ficar sem conexão: o resto do sistema baixa em segundo plano.
  void loader.preload('shadowrun', '5e').catch(() => {})
  const c = { system, metatypes, priorities, mechanics } as Catalogs
  uiCatalogs.value = {
    columns: c.priorities.columns,
    rows: c.priorities.rows,
    metatypes: c.metatypes.metatypes,
    attributes: (attributes as { attributes: UiCatalogs['attributes'] }).attributes,
    awakenings: (awakening as { awakenings: UiCatalogs['awakenings'] }).awakenings,
  }
  return createShadowrun(c)
}

export const world: SystemWorld = { theme: shadowrunTheme, Creation: CreationFlow, rules }
