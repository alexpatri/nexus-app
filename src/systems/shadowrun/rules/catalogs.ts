// Só os trechos dos catálogos que a estratégia usa. As fórmulas ficam como
// saem do JSON, que é o que evaluate recebe.

export interface Metatype {
  id: string
  name: string
  attributes: Record<string, { min?: number; max?: number; start?: number }>
  traits: { modifiers?: { target: string; add?: unknown }[] }[]
  sprintPerHit: number
}

export interface PriorityRow {
  priority: string
  metatype: { metatype: string; specialPoints: number }[]
  attributes: number
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
    skills: { knowledgePoints: unknown }
    contacts: { karma: unknown }
  }
  progression: { costs: { attribute: unknown } }
}

export interface Catalogs {
  system: { creation: { steps: { id: string }[] } }
  metatypes: { metatypes: Metatype[] }
  priorities: { rows: PriorityRow[] }
  mechanics: Mechanics
}
