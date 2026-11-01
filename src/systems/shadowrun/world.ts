import type { CatalogLoader } from '@/core/catalog/loader'
import type { SystemWorld } from '@/systems'
import CreationFlow from './creation/CreationFlow.vue'
import type { Catalogs } from './rules/catalogs'
import { createShadowrun } from './rules'
import { shadowrunTheme } from './theme'

async function rules(loader: CatalogLoader) {
  const [system, metatypes, priorities, mechanics] = await Promise.all(
    ['system', 'metatypes', 'priorities', 'mechanics'].map((name) =>
      loader.catalog('shadowrun', '5e', name),
    ),
  )
  // A mesa pode ficar sem conexão: o resto do sistema baixa em segundo plano.
  void loader.preload('shadowrun', '5e').catch(() => {})
  return createShadowrun({ system, metatypes, priorities, mechanics } as Catalogs)
}

export const world: SystemWorld = { theme: shadowrunTheme, Creation: CreationFlow, rules }
