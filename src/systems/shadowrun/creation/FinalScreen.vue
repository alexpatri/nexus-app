<script setup lang="ts">
import { computed } from 'vue'

import type { Violation } from '@/core/rules/system'
import type { Derived } from '../rules'
import { startingLifestyle } from '../rules/resources'
import type { Sheet } from '../rules/validate'
import { useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { decimal, resourceMessage, yen } from './resources'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
  base: string
}>()

const c = useCatalogs()
const carry = c.mechanics.creation
const sheet = computed(() => props.data as Sheet)
const lifestyle = computed(() => startingLifestyle(c.lookup, sheet.value))
const roll = computed(() => sheet.value.resources?.startingNuyenRoll)

const unused: { budget: string; what: string; step: string }[] = [
  { budget: 'special', what: 'pontos especiais', step: 'attributes' },
  { budget: 'attributes', what: 'pontos de atributo', step: 'attributes' },
  { budget: 'skills', what: 'pontos de perícia', step: 'skills' },
  { budget: 'skillGroups', what: 'pontos de grupo de perícias', step: 'skills' },
  { budget: 'knowledge', what: 'pontos de conhecimento', step: 'skills' },
  { budget: 'contacts', what: 'de carma gratuito em contatos', step: 'karma' },
]

// O que sobra e se perde: não é violação (contrato, decisão 5), mas o jogador
// precisa saber antes de finalizar.
const losses = computed(() => {
  const b = props.derived?.budgets ?? {}
  const out: { text: string; step: string }[] = []
  for (const u of unused) {
    const x = b[u.budget]
    if (x && x.total > x.spent)
      out.push({ text: `${x.total - x.spent} ${u.what} sem uso`, step: u.step })
  }
  const n = b.nuyen
  if (n && n.total - n.spent > carry.resources.nuyenCarryOver) {
    out.push({
      text: `${yen(n.total - n.spent - carry.resources.nuyenCarryOver)} acima de ${yen(carry.resources.nuyenCarryOver)} se perdem`,
      step: 'resources',
    })
  }
  const k = b.karma
  if (k && k.total - k.spent > carry.karmaCarryOver) {
    out.push({
      text: `${k.total - k.spent - carry.karmaCarryOver} de carma acima de ${carry.karmaCarryOver} se perdem`,
      step: 'karma',
    })
  }
  return out
})

function setRoll(e: Event) {
  const v = Math.trunc(Number((e.target as HTMLInputElement).value))
  props.edit((data) => {
    const r = { ...((data.resources as Record<string, unknown> | undefined) ?? {}) }
    if (Number.isFinite(v) && v > 0) r.startingNuyenRoll = v
    else delete r.startingNuyenRoll
    data.resources = r
  })
}

const d = computed(() => props.derived)
const initiatives: Record<string, string> = {
  physical: 'Física',
  astral: 'Astral',
  matrixAR: 'Matriz (RA)',
  matrixVRCold: 'Matriz (sim fechado)',
  matrixVRHot: 'Matriz (sim aberto)',
}

useFooter({
  status: computed(() =>
    losses.value.length ? `${losses.value.length} sobra(s) a revisar` : 'Nada se perde',
  ),
  alert: computed(() => {
    const v = props.violations[0]
    return v ? resourceMessage(c, v) : ''
  }),
})
</script>

<template>
  <section class="side">
    <h2>Nuyen inicial</h2>
    <template v-if="lifestyle?.startingNuyen">
      <p class="intro">
        Role {{ lifestyle.startingNuyen.dice }}D6 e informe a soma. Ela vezes
        {{ lifestyle.startingNuyen.multiplier }}, mais até {{ yen(carry.resources.nuyenCarryOver) }}
        que sobraram, é o dinheiro do personagem no início do jogo.
      </p>
      <div class="field">
        <label class="label" for="roll">Soma dos dados</label>
        <input
          id="roll"
          type="number"
          inputmode="numeric"
          :min="lifestyle.startingNuyen.dice"
          :max="lifestyle.startingNuyen.dice * 6"
          :value="roll ?? ''"
          @change="setRoll"
        />
      </div>
      <p v-if="d?.startingNuyen !== undefined" class="result">
        <span class="numeric">{{ yen(d.startingNuyen) }}</span> para começar
      </p>
    </template>
    <p v-else class="intro">Escolha um estilo de vida principal no passo de recursos.</p>
  </section>

  <section class="side">
    <h2>O que vai se perder</h2>
    <ul v-if="losses.length" class="losses">
      <li v-for="l in losses" :key="l.text">
        <span>{{ l.text }}</span>
        <RouterLink :to="`${base}/${l.step}`">Voltar ao passo</RouterLink>
      </li>
    </ul>
    <p v-else class="intro">Nenhum ponto, nuyen ou carma fica sem uso.</p>
  </section>

  <section v-if="d?.limits" class="side">
    <h2>Números finais</h2>
    <dl class="grid">
      <div>
        <dt>Essência</dt>
        <dd class="numeric">{{ decimal(d.essence ?? 0) }}</dd>
      </div>
      <div>
        <dt>Armadura</dt>
        <dd class="numeric">{{ d.armor }}</dd>
      </div>
      <div>
        <dt>Limite Físico</dt>
        <dd class="numeric">{{ d.limits.physical }}</dd>
      </div>
      <div>
        <dt>Limite Mental</dt>
        <dd class="numeric">{{ d.limits.mental }}</dd>
      </div>
      <div>
        <dt>Limite Social</dt>
        <dd class="numeric">{{ d.limits.social }}</dd>
      </div>
      <div>
        <dt>Monitor Físico</dt>
        <dd class="numeric">{{ d.monitors?.physical }}</dd>
      </div>
      <div>
        <dt>Monitor de Atordoamento</dt>
        <dd class="numeric">{{ d.monitors?.stun }}</dd>
      </div>
      <div>
        <dt>Caixas em excesso</dt>
        <dd class="numeric">{{ d.monitors?.overflow }}</dd>
      </div>
      <div v-for="(ini, id) in d.initiative" :key="id">
        <dt>Iniciativa {{ initiatives[id] ?? id }}</dt>
        <dd class="numeric">{{ ini.base }} + {{ ini.dice }}D6</dd>
      </div>
      <div>
        <dt>Movimento</dt>
        <dd class="numeric">{{ d.movement?.walk }} / {{ d.movement?.run }} m</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: var(--space-5);
}

h2 {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
}

.intro {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-width: 12em;
}

.label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

input {
  height: var(--touch-min);
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font: inherit;
  font-size: 1.25rem;
  font-weight: 700;
}

.result {
  margin: 0;
  font-size: var(--text-sm);
}

.result .numeric {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--sr-print);
}

.losses {
  margin: 0;
  padding: 0;
  list-style: none;
}

.losses li {
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
  font-size: var(--text-sm);
}

.losses a {
  color: var(--sr-pen);
  font-weight: 600;
  white-space: nowrap;
}

.grid {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.grid div {
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid var(--color-border);
  background: var(--color-surface-raised);
}

dt {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

dd {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--sr-print);
}
</style>
