import type { AdeptPower, Catalogs, Metatype, PriorityRow, Quality, Skill } from './catalogs'
import { baseAttrs, specialAttrs } from './validate'

// Os catálogos indexados por id, como a estratégia consulta.
export interface Lookup {
  metatypes: Map<string, Metatype>
  priorities: Map<string, PriorityRow>
  qualities: Map<string, Quality>
  skills: Map<string, Skill>
  groups: Map<string, string[]>
  // Atributo de cada categoria de conhecimento.
  knowledge: Map<string, string>
  // Ids que o choice de uma qualidade pode apontar, pelo tipo do alvo ou pelo
  // ponteiro do catálogo.
  choices: Map<string, string[]>
  // Atributo de cada despertar (mag ou res).
  awakenings: Map<string, string>
  powers: Map<string, AdeptPower>
  // Ids de cada catálogo de magia que o Lenient confere.
  magicIds: Map<string, string[]>
}

export function lookup(c: Catalogs): Lookup {
  const skills = new Map(c.skills.skills.map((s) => [s.id, s]))
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id)
  const spells = ids(c.spells.spells)
  return {
    metatypes: new Map(c.metatypes.metatypes.map((m) => [m.id, m])),
    priorities: new Map(c.priorities.rows.map((r) => [r.priority, r])),
    qualities: new Map(c.qualities.qualities.map((q) => [q.id, q])),
    skills,
    groups: new Map(c.skills.groups.map((g) => [g.id, g.skills])),
    knowledge: new Map(c.skills.knowledge.categories.map((k) => [k.id, k.attribute])),
    choices: new Map([
      ['skill', [...skills.keys()].sort()],
      ['attribute', [...baseAttrs, 'ess', ...specialAttrs]],
      ['limit', ['physical', 'mental', 'social']],
      ['mentors.json#mentors', c.mentors.mentors.map((m) => m.id)],
      ['traditions.json#spiritTypes', c.traditions.spiritTypes.map((t) => t.id)],
    ]),
    awakenings: new Map(c.awakening.awakenings.map((a) => [a.id, a.attribute])),
    powers: new Map(c['adept-powers'].powers.map((p) => [p.id, p])),
    magicIds: new Map([
      ['traditions', ids(c.traditions.traditions)],
      ['spiritTypes', ids(c.traditions.spiritTypes)],
      ['spriteTypes', ids(c['complex-forms'].spriteTypes)],
      ['complexForms', ids(c['complex-forms'].complexForms)],
      ['spells', spells],
      ['rituals', ids(c.spells.rituals)],
      // Preparativo é a fórmula alquímica de um feitiço.
      ['preparations', spells],
    ]),
  }
}
