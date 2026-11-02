// Só os trechos dos catálogos que a estratégia usa. As fórmulas ficam como
// saem do JSON, que é o que evaluate recebe.

export interface Metatype {
  id: string
  name: string
  attributes: Record<string, { min?: number; max?: number; start?: number }>
  traits: { name: string; modifiers?: { target: string; add?: unknown }[] }[]
  sprintPerHit: number
}

export interface FreeSkillRule {
  count: number
  rating: number
  from: { attribute?: string; groups?: string[]; kind?: string }
}

// O que uma letra da coluna Magia ou Ressonância dá a um despertar.
export interface MagicEntry {
  awakening: string
  attribute: { id: string; value: number }
  skills?: FreeSkillRule
  skillGroups?: FreeSkillRule
  formulas?: number
  complexForms?: number
}

export interface PriorityRow {
  priority: string
  metatype: { metatype: string; specialPoints: number }[]
  attributes: number
  magic: MagicEntry[]
  skills: { points: number; groupPoints: number }
  resources: number
}

interface Initiative {
  base: unknown
  dice: number
}

export interface Mechanics {
  derived: {
    initiative: {
      physical: Initiative
      astral: Initiative
      matrixAR: Initiative
      matrixVRCold: Initiative
      matrixVRHot: Initiative
      maxDice: number
    }
    livingPersona: { dataProcessing: unknown }
    limits: Record<'physical' | 'mental' | 'social', { value: unknown }>
    monitors: Record<'physical' | 'stun' | 'overflow', { boxes: unknown }>
    attributeTests: Record<
      'composure' | 'judgeIntentions' | 'memory' | 'liftCarry',
      { pool: unknown }
    >
    lifting: Record<'lift' | 'overhead' | 'carry', unknown>
    movement: Record<'walk' | 'run', unknown>
    reputation: {
      streetCred: { value: unknown }
      notoriety: { base: number }
      publicAwareness: { base: number }
    }
  }
  creation: {
    karma: number
    qualities: { positiveMax: number; negativeMax: number }
    skills: { knowledgePoints: unknown; maxRating: number; specializationCost: number }
    contacts: { karma: unknown }
    specialAttributeMax: Record<string, number>
    purchases: {
      spell: { karma: number; max: unknown }
      complexForm: { karma: number; max: unknown }
      powerPoint: { karma: number }
      boundSpiritService: { karma: number }
      registeredSpriteTask: { karma: number }
    }
  }
  progression: {
    costs: Record<
      | 'attribute'
      | 'activeSkill'
      | 'skillGroup'
      | 'knowledgeSkill'
      | 'languageSkill'
      | 'specialization',
      unknown
    >
  }
}

export interface QualityOption {
  id: string
  karma: number
}

export interface QualityModifier {
  target: string
  // Alvo fixo, ou { choose, except, only } quando o alvo é o choice.
  of?: string | { choose: string; except?: string[]; only?: string[] }
  add?: unknown
  times?: unknown
}

export interface Quality {
  id: string
  kind: 'positive' | 'negative'
  karma:
    | number
    | { perLevel: number }
    | { options: QualityOption[] }
    | { sum: { id: string; options: QualityOption[] }[] }
  levels?: { max: number }
  // Ponteiro para o catálogo de onde vem a escolha (tradições, mentores).
  choice?: string
  modifiers?: QualityModifier[]
  requires?: { metatype?: string[]; special?: string }
  unique?: boolean
}

export interface Skill {
  id: string
  attribute: string
  group: string | null
  category: string
  restricted: boolean
}

export interface AdeptPower {
  id: string
  powerPoints: number | { perLevel: number } | { byLevel: number[] } | { each: number }
  parameter?: { kind: string; options?: string[]; categories?: string[]; except?: string[] }
  levels?: { max: number }
}

type Ids = { id: string }[]

export interface SkillsCatalog {
  skills: Skill[]
  groups: { id: string; skills: string[] }[]
  knowledge: { categories: { id: string; attribute: string }[] }
}

export interface Catalogs {
  system: { creation: { steps: { id: string }[] } }
  metatypes: { metatypes: Metatype[] }
  priorities: { columns: { id: string; name: string }[]; rows: PriorityRow[] }
  mechanics: Mechanics
  qualities: { qualities: Quality[] }
  skills: SkillsCatalog
  mentors: { mentors: { id: string }[] }
  traditions: { spiritTypes: Ids; traditions: Ids }
  awakening: { awakenings: { id: string; name: string; attribute: string }[] }
  'adept-powers': { powers: AdeptPower[] }
  'complex-forms': { complexForms: Ids; spriteTypes: Ids }
  spells: { spells: Ids; rituals: Ids }
}
