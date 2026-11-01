import type { Component } from 'vue'

import type { CatalogLoader } from '@/core/catalog/loader'
import type { RulesSystem } from '@/core/rules/system'
import type { OpenSheet } from '@/core/sheets/open'
import type { Brand, Theme } from '@/design/contract'
import { shadowrunBrand } from './shadowrun/brand'

// O que o sistema traz quando a pessoa entra nele: tema, fonte, telas e regras.
// Fica atrás de import() para quem não joga o sistema não baixar nada dele.
export interface SystemWorld {
  theme: Theme
  Creation: Component<{ open: OpenSheet; rules: RulesSystem; step?: string }>
  rules: (loader: CatalogLoader) => Promise<RulesSystem>
}

// O que o shell do Nexus sabe de cada sistema com módulo no app.
export interface SystemModule {
  id: string
  version: string
  brand: Brand
  description: string
  load: () => Promise<SystemWorld>
}

export const modules: SystemModule[] = [
  {
    id: 'shadowrun',
    version: '5e',
    brand: shadowrunBrand,
    description: 'Livro Básico, Quinta Edição (New Order). Criação por prioridades, em 9 passos.',
    load: () => import('./shadowrun/world').then((m) => m.world),
  },
]

export function moduleFor(system: string, version: string): SystemModule | undefined {
  return modules.find((m) => m.id === system && m.version === version)
}
