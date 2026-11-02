import type { CatalogLoader } from '@/core/catalog/loader'
import type { SystemWorld } from '@/systems'
import './creation/inks.css'
import CreationFlow from './creation/CreationFlow.vue'
import { buildUiCatalogs, type RawCatalogs, uiCatalogs } from './creation/catalogs'
import { createShadowrun } from './rules'
import { shadowrunTheme } from './theme'

async function rules(loader: CatalogLoader) {
  const names = [
    'system',
    'metatypes',
    'priorities',
    'mechanics',
    'attributes',
    'awakening',
    'qualities',
    'skills',
    'mentors',
    'traditions',
  ]
  const loaded = await Promise.all(names.map((name) => loader.catalog('shadowrun', '5e', name)))
  // A mesa pode ficar sem conexão: o resto do sistema baixa em segundo plano.
  void loader.preload('shadowrun', '5e').catch(() => {})
  const c = Object.fromEntries(names.map((n, i) => [n, loaded[i]])) as unknown as RawCatalogs
  uiCatalogs.value = buildUiCatalogs(c)
  return createShadowrun(c)
}

export const world: SystemWorld = { theme: shadowrunTheme, Creation: CreationFlow, rules }
