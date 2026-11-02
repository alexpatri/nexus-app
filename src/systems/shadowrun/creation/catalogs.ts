import { shallowRef } from 'vue'

import type { AdeptPower, Catalogs, Metatype, PriorityRow, Quality, Skill } from '../rules/catalogs'
import { type Lookup, lookup } from '../rules/lookup'

type Named = { id: string; name: string }

// Os catálogos que as telas leem, além do que as regras usam. Preenchido pelo
// world.rules antes de a criação abrir.
export interface UiCatalogs {
  columns: Named[]
  rows: PriorityRow[]
  metatypes: Metatype[]
  attributes: (Named & { abbr: string; category: string })[]
  awakenings: Named[]
  qualities: (Quality & { name: string; desc: string })[]
  skills: (Skill & { name: string; specializations: string[]; category: string })[]
  groups: (Named & { skills: string[] })[]
  knowledgeCategories: (Named & { attribute: string })[]
  mentors: Named[]
  spiritTypes: Named[]
  traditions: Named[]
  spells: (Named & { category: string; desc?: string })[]
  rituals: (Named & { desc?: string })[]
  complexForms: (Named & { desc?: string })[]
  adeptPowers: (AdeptPower & { name: string; desc?: string })[]
  // Nível máximo de perícia na criação (mechanics.json#creation.skills.maxRating).
  skillMaxRating: number
  lookup: Lookup
}

export interface RawCatalogs extends Catalogs {
  attributes: { attributes: UiCatalogs['attributes'] }
}

export function buildUiCatalogs(c: RawCatalogs): UiCatalogs {
  return {
    columns: c.priorities.columns,
    rows: c.priorities.rows,
    metatypes: c.metatypes.metatypes,
    attributes: c.attributes.attributes,
    awakenings: c.awakening.awakenings,
    qualities: c.qualities.qualities as UiCatalogs['qualities'],
    skills: c.skills.skills as UiCatalogs['skills'],
    groups: c.skills.groups as UiCatalogs['groups'],
    knowledgeCategories: c.skills.knowledge.categories as UiCatalogs['knowledgeCategories'],
    mentors: c.mentors.mentors as Named[],
    spiritTypes: c.traditions.spiritTypes as Named[],
    traditions: c.traditions.traditions as Named[],
    spells: c.spells.spells as UiCatalogs['spells'],
    rituals: c.spells.rituals as UiCatalogs['rituals'],
    complexForms: c['complex-forms'].complexForms as UiCatalogs['complexForms'],
    adeptPowers: c['adept-powers'].powers as UiCatalogs['adeptPowers'],
    skillMaxRating: c.mechanics.creation.skills.maxRating,
    lookup: lookup(c),
  }
}

export const uiCatalogs = shallowRef<UiCatalogs>()

export function useCatalogs(): UiCatalogs {
  if (!uiCatalogs.value) throw new Error('shadowrun: catálogos não carregados')
  return uiCatalogs.value
}

// Nome para mostrar de um id de catálogo; o id nunca vai para a tela.
export function nameOf(list: Named[], id: string | undefined): string {
  return list.find((x) => x.id === id)?.name ?? id ?? ''
}
