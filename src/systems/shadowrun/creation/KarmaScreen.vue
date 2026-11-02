<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Violation } from '@/core/rules/system'
import NxButton from '@/core/ui/NxButton.vue'
import type { Derived } from '../rules'
import { qualityEffects } from '../rules/qualities'
import type { Contact, Sheet } from '../rules/validate'
import BudgetBoxes from '../ui/BudgetBoxes.vue'
import NumberStepper from '../ui/NumberStepper.vue'
import PickerSheet, { type PickerItem } from '../ui/PickerSheet.vue'
import { nameOf, useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { karmaMessage, stepsCost } from './karma'
import { clone } from './edit'
import { newKey } from './keys'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
}>()

const c = useCatalogs()
const mech = c.mechanics
const costs = mech.progression.costs
const sheet = computed(() => props.data as Sheet)
const karma = computed(() => props.derived?.budgets.karma)
const free = computed(() => props.derived?.budgets.contacts)
const left = computed(() => (karma.value ? karma.value.total - karma.value.spent : 0))
const picking = ref(false)

const meta = computed(() => c.metatypes.find((m) => m.id === sheet.value.metatype))
const fx = computed(() => qualityEffects(c.lookup, sheet.value))
// Perda de Magia e Ressonância por Essência: baixa o valor e o máximo.
const loss = computed(() => {
  const start = meta.value?.attributes.ess?.start ?? 6
  return Math.max(0, Math.ceil(start - (props.derived?.essence ?? start)))
})

const attributes = computed(() =>
  c.attributes
    .filter((a) => a.id !== 'ess' && props.derived?.attributes?.[a.id])
    .map((a) => {
      const k = sheet.value.attributes?.[a.id]?.karma ?? 0
      const special = a.id === 'mag' || a.id === 'res'
      const natural = props.derived!.attributes![a.id]!.natural + (special ? loss.value : 0)
      const max =
        (special
          ? (mech.creation.specialAttributeMax[a.id] ?? 6)
          : (meta.value?.attributes[a.id]?.max ?? 6)) + (fx.value.attrMax[a.id] ?? 0)
      return {
        ...a,
        karma: k,
        value: natural - (special ? loss.value : 0),
        room: max - natural,
        from: natural - k,
      }
    }),
)

function setKarma(path: (data: Record<string, unknown>) => Record<string, unknown>, value: number) {
  props.edit((data) => {
    const target = path(data)
    if (value > 0) target.karma = value
    else delete target.karma
  })
}

const ensure = (o: Record<string, unknown>, key: string) =>
  (o[key] ??= {}) as Record<string, unknown>

const skillMax = (id: string) => c.skillMaxRating + (fx.value.skillMax[id] ?? 0)
const active = computed(() => {
  const derived = props.derived?.skills?.active ?? {}
  const bought = sheet.value.skills?.active ?? {}
  return [...new Set([...Object.keys(derived), ...Object.keys(bought)])]
    .map((id) => {
      const rating = derived[id]?.rating ?? 0
      const k = bought[id]?.karma ?? 0
      return { id, name: nameOf(c.skills, id), rating, karma: k, from: rating - k }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
})
const knowledge = computed(() =>
  (sheet.value.skills?.knowledge ?? []).map((k) => ({
    key: k.key,
    name: k.name || 'Conhecimento sem nome',
    karma: k.karma ?? 0,
    from: k.points ?? 0,
    formula: costs.knowledgeSkill,
    list: 'knowledge' as const,
  })),
)
const languages = computed(() =>
  (sheet.value.skills?.languages ?? [])
    .filter((l) => !l.native)
    .map((l) => ({
      key: l.key,
      name: l.name || 'Idioma sem nome',
      karma: l.karma ?? 0,
      from: l.points ?? 0,
      formula: costs.languageSkill,
      list: 'languages' as const,
    })),
)

function setActiveKarma(id: string, value: number) {
  setKarma((data) => ensure(ensure(ensure(data, 'skills'), 'active'), id), value)
  props.edit((data) => {
    const skills = data.skills as { active: Record<string, object> }
    if (Object.keys(skills.active[id]!).length === 0) delete skills.active[id]
  })
}

function setListKarma(list: 'knowledge' | 'languages', key: string, value: number) {
  setKarma((data) => {
    const items = (data.skills as Record<string, { key: string }[]>)[list]!
    return items.find((x) => x.key === key) as unknown as Record<string, unknown>
  }, value)
}

const awakening = computed(() => sheet.value.magic?.awakening)
const bound = computed(() =>
  awakening.value === 'technomancer'
    ? {
        list: 'sprites' as const,
        count: 'tasks' as const,
        types: c.spriteTypes,
        title: 'Sprites registrados',
        unit: 'tarefas',
        one: 'tarefa',
        add: 'Registrar sprite',
      }
    : ['magician', 'mystic-adept', 'aspected-magician'].includes(awakening.value ?? '')
      ? {
          list: 'spirits' as const,
          count: 'services' as const,
          types: c.spiritTypes,
          title: 'Espíritos vinculados',
          unit: 'serviços',
          one: 'serviço',
          add: 'Vincular espírito',
        }
      : undefined,
)
type Bound = { key: string; type: string; services?: number; tasks?: number }
const boundItems = computed(() =>
  bound.value ? ((sheet.value.magic?.[bound.value.list] ?? []) as Bound[]) : [],
)
const cha = computed(() => props.derived?.attributes?.cha?.natural ?? 0)

function changeBound(key: string, update: (x: Bound) => void) {
  const b = bound.value!
  props.edit((data) => {
    const magic = data.magic as Record<string, Bound[]>
    const items = clone(magic[b.list] ?? [])
    update(items.find((x) => x.key === key)!)
    magic[b.list] = items
  })
}

function addBound() {
  const b = bound.value!
  const key = newKey(props.data)
  props.edit((data) => {
    const magic = data.magic as Record<string, Bound[]>
    magic[b.list] = [...(magic[b.list] ?? []), { key, type: b.types[0]!.id, [b.count]: 1 }]
  })
}

function removeBound(key: string) {
  const b = bound.value!
  props.edit((data) => {
    const magic = data.magic as Record<string, Bound[]>
    magic[b.list] = magic[b.list]!.filter((x) => x.key !== key)
    if (magic[b.list]!.length === 0) delete magic[b.list]
  })
}

const contacts = computed(() => sheet.value.contacts ?? [])
const maxKarma = mech.creation.contacts.maxKarmaPerContact

function changeContact(key: string, update: (x: Contact) => void) {
  props.edit((data) => {
    const items = clone((data.contacts ?? []) as Contact[])
    update(items.find((x) => x.key === key)!)
    data.contacts = items
  })
}

function addContact() {
  const key = newKey(props.data)
  props.edit((data) => {
    data.contacts = [
      ...((data.contacts ?? []) as Contact[]),
      { key, name: '', connection: 1, loyalty: 1 },
    ]
  })
}

function removeContact(key: string) {
  props.edit((data) => {
    const items = ((data.contacts ?? []) as Contact[]).filter((x) => x.key !== key)
    if (items.length) data.contacts = items
    else delete data.contacts
  })
}

const problems = computed(() => {
  const out = new Map<string, string>()
  for (const v of props.violations) {
    const key =
      /^contacts\[([^\]]+)\]/.exec(v.path)?.[1] ??
      /^attributes\.(\w+)/.exec(v.path)?.[1] ??
      /^skills\.active\.([\w-]+)/.exec(v.path)?.[1]
    if (key && !out.has(key)) out.set(key, karmaMessage(c, v))
  }
  return out
})

const pickerItems = computed<PickerItem[]>(() => {
  const has = new Set(active.value.map((s) => s.id))
  return c.skills
    .filter((s) => !has.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      note: nameOf(c.attributes, s.attribute),
      price: `${stepsCost(costs.activeSkill, 0, 1)} de carma`,
      blocked:
        s.category === 'magical' && !props.derived?.attributes?.mag
          ? 'Só para despertos'
          : s.category === 'resonance' && !props.derived?.attributes?.res
            ? 'Só para tecnomantes'
            : undefined,
    }))
})

function addSkill(id: string) {
  setActiveKarma(id, 1)
  picking.value = false
}

useFooter({
  status: computed(() =>
    karma.value
      ? `Carma: ${left.value} restantes${left.value > mech.creation.karmaCarryOver ? `, ${left.value - mech.creation.karmaCarryOver} se perdem` : ''}`
      : '',
  ),
  alert: computed(() => {
    const v = props.violations[0]
    return v ? karmaMessage(c, v) : ''
  }),
})
</script>

<template>
  <div class="sticky">
    <BudgetBoxes v-if="karma" label="Carma" :total="karma.total" :spent="karma.spent" />
    <p class="intro">
      Até {{ mech.creation.karmaCarryOver }} de carma passa para o jogo; o resto se perde.
    </p>
  </div>

  <section class="side">
    <h2>Atributos</h2>
    <ul>
      <li v-for="a in attributes" :key="a.id" :class="['line', { flagged: problems.has(a.id) }]">
        <span class="text">
          <span class="name"
            >{{ a.name }} <span class="numeric value">{{ a.value }}</span></span
          >
          <span class="detail">
            {{
              `${a.karma ? `${stepsCost(costs.attribute, a.from, a.karma)} de carma` : 'Sem carma'}; próximo nível custa ${stepsCost(costs.attribute, a.from + a.karma, 1)}`
            }}
          </span>
          <span v-if="problems.has(a.id)" class="problem">{{ problems.get(a.id) }}</span>
        </span>
        <NumberStepper
          :label="`carma em ${a.name}`"
          :value="a.karma"
          :min="0"
          :max="a.karma + Math.max(0, a.room)"
          @change="setKarma((d) => ensure(ensure(d, 'attributes'), a.id), $event)"
        />
      </li>
    </ul>
  </section>

  <section class="side">
    <h2>Perícias</h2>
    <ul>
      <li v-for="s in active" :key="s.id" :class="['line', { flagged: problems.has(s.id) }]">
        <span class="text">
          <span class="name"
            >{{ s.name }} <span class="numeric value">{{ s.rating }}</span></span
          >
          <span class="detail">
            {{
              s.karma ? `${stepsCost(costs.activeSkill, s.from, s.karma)} de carma` : 'Sem carma'
            }}
          </span>
          <span v-if="problems.has(s.id)" class="problem">{{ problems.get(s.id) }}</span>
        </span>
        <NumberStepper
          :label="`carma em ${s.name}`"
          :value="s.karma"
          :min="0"
          :max="s.karma + Math.max(0, skillMax(s.id) - s.rating)"
          @change="setActiveKarma(s.id, $event)"
        />
      </li>
      <li v-for="k in [...knowledge, ...languages]" :key="k.key" class="line">
        <span class="text">
          <span class="name"
            >{{ k.name }} <span class="numeric value">{{ k.from + k.karma }}</span></span
          >
          <span class="detail">
            {{ k.list === 'languages' ? 'Idioma' : 'Conhecimento' }},
            {{ k.karma ? `${stepsCost(k.formula, k.from, k.karma)} de carma` : 'sem carma' }}
          </span>
        </span>
        <NumberStepper
          :label="`carma em ${k.name}`"
          :value="k.karma"
          :min="0"
          :max="k.karma + Math.max(0, mech.creation.skills.maxRating - k.from - k.karma)"
          @change="setListKarma(k.list, k.key, $event)"
        />
      </li>
    </ul>
    <button type="button" class="sr-outline add" @click="picking = true">
      <span>Comprar perícia nova</span>
    </button>
  </section>

  <section v-if="bound" class="side">
    <h2>{{ bound.title }}</h2>
    <p class="intro">Cada {{ bound.one }} custa 1 de carma; até {{ cha }}, o Carisma.</p>
    <ul>
      <li v-for="x in boundItems" :key="x.key" class="block">
        <div class="field">
          <label class="label" :for="`${x.key}-type`">Tipo</label>
          <select
            :id="`${x.key}-type`"
            :value="x.type"
            @change="
              changeBound(x.key, (y) => (y.type = ($event.target as HTMLSelectElement).value))
            "
          >
            <option v-for="t in bound.types" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div class="field">
          <span class="label capital">{{ bound.unit }}</span>
          <NumberStepper
            :label="`${bound.unit} de ${nameOf(bound.types, x.type)}`"
            :value="Number(x[bound.count] ?? 0)"
            :min="1"
            @change="changeBound(x.key, (y) => (y[bound!.count] = $event))"
          />
        </div>
        <NxButton variant="text" class="remove" @click="removeBound(x.key)">Remover</NxButton>
      </li>
    </ul>
    <button
      type="button"
      class="sr-outline add"
      :disabled="boundItems.length >= cha"
      @click="addBound"
    >
      <span>{{ bound.add }}</span>
    </button>
  </section>

  <section class="side">
    <h2>Contatos</h2>
    <BudgetBoxes
      v-if="free"
      label="Carma gratuito em contatos"
      :total="free.total"
      :spent="Math.min(free.spent, free.total)"
    />
    <p v-if="free && free.spent > free.total" class="intro">
      {{ free.spent - free.total }} de carma além do gratuito sai do carma do personagem.
    </p>
    <ul>
      <li
        v-for="ct in contacts"
        :key="ct.key"
        :class="['block', { flagged: problems.has(ct.key) }]"
      >
        <div class="field">
          <label class="label" :for="`${ct.key}-name`">Contato</label>
          <input
            :id="`${ct.key}-name`"
            type="text"
            placeholder="Atravessador, médico de rua…"
            :value="ct.name ?? ''"
            @change="
              changeContact(ct.key, (x) => (x.name = ($event.target as HTMLInputElement).value))
            "
          />
        </div>
        <p class="cost">
          custa <span class="numeric">{{ (ct.connection ?? 1) + (ct.loyalty ?? 1) }}</span>
        </p>
        <div class="pair">
          <div class="field">
            <span class="label">Conexão</span>
            <NumberStepper
              :label="`Conexão de ${ct.name || 'contato'}`"
              :value="ct.connection ?? 1"
              :min="1"
              :max="Math.min(mech.creation.contacts.maxConnection, maxKarma - (ct.loyalty ?? 1))"
              @change="changeContact(ct.key, (x) => (x.connection = $event))"
            />
          </div>
          <div class="field">
            <span class="label">Lealdade</span>
            <NumberStepper
              :label="`Lealdade de ${ct.name || 'contato'}`"
              :value="ct.loyalty ?? 1"
              :min="1"
              :max="Math.min(mech.creation.contacts.maxLoyalty, maxKarma - (ct.connection ?? 1))"
              @change="changeContact(ct.key, (x) => (x.loyalty = $event))"
            />
          </div>
        </div>
        <span v-if="problems.has(ct.key)" class="problem">{{ problems.get(ct.key) }}</span>
        <NxButton variant="text" class="remove" @click="removeContact(ct.key)"
          >Remover contato</NxButton
        >
      </li>
    </ul>
    <button type="button" class="sr-outline add" @click="addContact">
      <span>Adicionar contato</span>
    </button>
  </section>

  <PickerSheet
    :open="picking"
    title="Perícia nova"
    :subtitle="karma ? `${left} de carma restantes` : undefined"
    :items="pickerItems"
    @close="picking = false"
  >
    <template #action="{ item }">
      <NxButton @click="addSkill(item.id)">Comprar nível 1 por {{ item.price }}</NxButton>
    </template>
  </PickerSheet>
</template>

<style scoped>
/* O orçamento fica parado; a lista rola por baixo. */
.sticky {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-4)) var(--space-4);
  padding: 14px var(--space-4) var(--space-3);
  background: var(--color-surface);
  border-bottom: var(--border-width) solid var(--color-rule);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.intro {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
}

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

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
}

.line {
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) 0;
}

.text {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: var(--text-md);
  font-weight: 600;
}

.value {
  color: var(--sr-print);
  font-weight: 700;
}

.detail {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.problem {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-danger);
}

.flagged .name {
  color: var(--color-danger);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pair {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.capital::first-letter {
  text-transform: uppercase;
}

.label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.cost {
  margin: 0;
  font-size: var(--text-sm);
}

select,
input[type='text'] {
  height: var(--touch-min);
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font: inherit;
  min-width: 0;
}

.remove {
  align-self: flex-start;
  color: var(--color-danger);
}

.add {
  align-self: flex-start;
  min-height: var(--touch-min);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
}

.add > span {
  padding: 0 14px;
}
</style>
