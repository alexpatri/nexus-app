import type { Catalogs, Metatype, PriorityRow, Quality, Skill } from './catalogs'
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
}

export function lookup(c: Catalogs): Lookup {
  const skills = new Map(c.skills.skills.map((s) => [s.id, s]))
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
  }
}
