// Só os trechos dos catálogos que a estratégia usa. As fórmulas ficam como
// saem do JSON, que é o que evaluate recebe.

export interface Metatype {
  id: string
  name: string
  attributes: Record<string, { min?: number; max?: number; start?: number }>
  traits: { name: string; modifiers?: { target: string; add?: unknown }[] }[]
  sprintPerHit: number
}

export interface PriorityRow {
  priority: string
  metatype: { metatype: string; specialPoints: number }[]
  attributes: number
  magic: { awakening: string; attribute: { id: string; value: number } }[]
  skills: { points: number; groupPoints: number }
  resources: number
}

interface Initiative {
  base: unknown
  dice: number
}

export interface Mechanics {
  derived: {
    initiative: { physical: Initiative; matrixAR: Initiative; maxDice: number }
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
  restricted: boolean
}

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
  traditions: { spiritTypes: { id: string }[] }
}
