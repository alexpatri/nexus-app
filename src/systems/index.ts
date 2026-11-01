import type { Brand } from '@/design/contract'
import { shadowrunBrand } from './shadowrun/brand'

// O que o shell do Nexus sabe de cada sistema com módulo no app. Cresce com o
// SystemModule de app-mobile-e-criacao-de-ficha-shadowrun.md.
export interface SystemModule {
  id: string
  version: string
  brand: Brand
}

export const modules: SystemModule[] = [{ id: 'shadowrun', version: '5e', brand: shadowrunBrand }]

export function moduleFor(system: string, version: string): SystemModule | undefined {
  return modules.find((m) => m.id === system && m.version === version)
}
