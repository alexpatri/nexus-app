import type { Component } from 'vue'

import type { CatalogLoader } from '@/core/catalog/loader'
import type { RulesSystem } from '@/core/rules/system'
import type { OpenSheet } from '@/core/sheets/open'
import type { Splash } from '@/core/ui/world'
import type { Brand, Theme } from '@/design/contract'
import { shadowrunBrand } from './shadowrun/brand'

// O que o sistema traz quando a pessoa entra nele: tema, fonte, telas e regras.
// Fica atrás de import() para quem não joga o sistema não baixar nada dele.
export interface SystemWorld {
  theme: Theme
  Creation: Component<{ open: OpenSheet; rules: RulesSystem; step?: string }>
  // Ficha pronta, sem passo na rota; editar volta para os passos da criação.
  Sheet: Component<{ open: OpenSheet; rules: RulesSystem }>
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

// O carregamento da passagem para o mundo do sistema, na cor principal dele.
export function splashOf(brand: Brand): Splash {
  return {
    color: brand.accent,
  }
}

export function moduleFor(system: string, version: string): SystemModule | undefined {
  return modules.find((m) => m.id === system && m.version === version)
}
