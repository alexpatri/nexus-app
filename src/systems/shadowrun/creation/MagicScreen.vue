<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import type { Violation } from '@/core/rules/system'
import NxButton from '@/core/ui/NxButton.vue'
import type { Derived } from '../rules'
import {
  aspects,
  formulaCount,
  magicFields,
  type MagicData,
  powerCost,
  type PowerItem,
} from '../rules/magic'
import BudgetBoxes from '../ui/BudgetBoxes.vue'
import PickerSheet, { type PickerItem } from '../ui/PickerSheet.vue'
import { nameOf, useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { newKey } from './keys'
import { givesOf, magicMessage, powerPrice } from './magic'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
}>()

const c = useCatalogs()
const uid = useId()
const magic = computed(() => (props.data.magic ?? {}) as MagicData)
const letter = computed(() => (props.data.priorities as Record<string, string> | undefined)?.magic)
const entries = computed(() => c.rows.find((r) => r.priority === letter.value)?.magic ?? [])
const entry = computed(() => entries.value.find((e) => e.awakening === magic.value.awakening))
const has = (field: string) => magicFields[magic.value.awakening ?? '']?.includes(field) ?? false
const mag = computed(() => props.derived?.attributes?.mag?.natural ?? 0)
const res = computed(() => props.derived?.attributes?.res?.natural ?? 0)
const mentor = computed(() =>
  ((props.data.qualities ?? []) as { id: string }[]).some((q) => q.id === 'mentor-spirit'),
)

type Picking = 'skill' | 'group' | 'spells' | 'rituals' | 'complexForms' | 'power'
const picking = ref<Picking>()
const expanded = ref<string>()

// Edita magic, tirando o que fica vazio ("ausente é vazio").
function update(change: (m: MagicData) => void) {
  props.edit((data) => {
    const m = JSON.parse(JSON.stringify(data.magic ?? {})) as MagicData & Record<string, unknown>
    change(m)
    for (const [k, v] of Object.entries(m)) {
      const empty =
        v === undefined ||
        v === '' ||
        v === 0 ||
        (Array.isArray(v) && v.length === 0) ||
        (k === 'formulas' && formulaCount(m) === 0)
      if (empty) delete m[k]
    }
    if (Object.keys(m).length > 0) data.magic = m
    else delete data.magic
  })
}

// Trocar de despertar mantém só o que o novo usa.
function setAwakening(id: string) {
  update((m) => {
    const keep = magicFields[id] ?? []
    for (const k of Object.keys(m)) {
      if (k !== 'awakening' && !keep.includes(k)) delete (m as Record<string, unknown>)[k]
    }
    m.awakening = id || undefined
  })
}

const freeRule = computed(() =>
  magic.value.awakening === 'aspected-magician' ? entry.value?.skillGroups : entry.value?.skills,
)
const freeChosen = computed(() =>
  magic.value.awakening === 'aspected-magician'
    ? (magic.value.freeSkillGroups ?? [])
    : (magic.value.freeSkills ?? []),
)

function toggleList(field: 'freeSkills' | 'freeSkillGroups' | 'complexForms', id: string) {
  update((m) => {
    const list = m[field] ?? []
    m[field] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  })
}

function toggleFormula(group: 'spells' | 'rituals', id: string) {
  update((m) => {
    const list = m.formulas?.[group] ?? []
    m.formulas = {
      ...m.formulas,
      [group]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    }
    if (m.formulas[group]!.length === 0) delete m.formulas[group]
  })
}

const powerOf = (id: string) => c.adeptPowers.find((p) => p.id === id)

function addPower(id: string) {
  const key = newKey(props.data)
  const pw = powerOf(id)!
  update((m) => {
    const it: PowerItem = { key, id }
    if (typeof pw.powerPoints !== 'number') it.rating = 1
    m.powers = [...(m.powers ?? []), it]
  })
  expanded.value = key
}

function changePower(key: string, patch: Partial<PowerItem>) {
  update((m) => {
    m.powers = (m.powers ?? []).map((p) => (p.key === key ? { ...p, ...patch } : p))
  })
}

function parameterOptions(id: string): { id: string; name: string }[] {
  const p = powerOf(id)?.parameter
  if (!p) return []
  if (p.kind === 'attribute')
    return (p.options ?? []).map((a) => ({ id: a, name: nameOf(c.attributes, a) }))
  if (p.kind === 'limit') {
    return [
      { id: 'physical', name: 'Físico' },
      { id: 'mental', name: 'Mental' },
      { id: 'social', name: 'Social' },
    ]
  }
  const skills = p.options
    ? c.skills.filter((s) => p.options!.includes(s.id))
    : c.skills.filter((s) => p.categories?.includes(s.category))
  return skills.filter((s) => !p.except?.includes(s.id)).map((s) => ({ id: s.id, name: s.name }))
}

const formulaMax = computed(() => mag.value * 2)
const formsMax = computed(() => res.value * 2)
const categoryNames: Record<string, string> = {
  combat: 'Combate',
  detection: 'Detecção',
  health: 'Saúde',
  illusion: 'Ilusão',
  manipulation: 'Manipulação',
}

const pickerTitle = computed(
  () =>
    ({
      skill: 'Perícia dada pela prioridade',
      group: 'Grupo dado pela prioridade',
      spells: 'Feitiço',
      rituals: 'Ritual',
      complexForms: 'Forma complexa',
      power: 'Poder de adepto',
    })[picking.value ?? 'skill'],
)

const pickerItems = computed<PickerItem[]>(() => {
  const m = magic.value
  const rule = freeRule.value
  switch (picking.value) {
    case 'skill':
      return c.skills
        .filter((s) =>
          rule?.from.attribute
            ? s.attribute === rule.from.attribute
            : rule?.from.groups
              ? rule.from.groups.includes(s.group ?? '')
              : !s.restricted,
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((s) => ({
          id: s.id,
          name: s.name,
          note: `Nível ${rule?.rating}`,
          price: '',
          blocked: m.freeSkills?.includes(s.id) ? 'Já escolhida' : undefined,
        }))
    case 'group':
      return (rule?.from.groups ?? []).map((g) => ({
        id: g,
        name: nameOf(c.groups, g),
        note: `Nível ${rule?.rating}`,
        price: '',
        blocked: m.aspect && g !== m.aspect ? 'Fora do aspecto' : undefined,
      }))
    case 'spells':
    case 'rituals': {
      const group = picking.value
      const list = group === 'spells' ? c.spells : c.rituals
      const chosen = m.formulas?.[group] ?? []
      return [...list]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((x) => ({
          id: x.id,
          name: x.name,
          note: 'category' in x ? (categoryNames[x.category as string] ?? '') : 'Ritual',
          price: '',
          description: x.desc,
          blocked: chosen.includes(x.id)
            ? 'Já está na ficha'
            : chosen.length >= formulaMax.value
              ? `Chega ao máximo de ${formulaMax.value}`
              : undefined,
        }))
    }
    case 'complexForms':
      return [...c.complexForms]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((x) => ({
          id: x.id,
          name: x.name,
          note: '',
          price: '',
          description: x.desc,
          blocked: m.complexForms?.includes(x.id)
            ? 'Já está na ficha'
            : (m.complexForms?.length ?? 0) >= formsMax.value
              ? `Chega ao máximo de ${formsMax.value}`
              : undefined,
        }))
    case 'power':
      return [...c.adeptPowers]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((p) => ({
          id: p.id,
          name: p.name,
          note: p.parameter ? 'Com alvo a escolher' : 'Sem alvo',
          price: powerPrice(p),
          description: p.desc,
        }))
  }
  return []
})

function pick(id: string) {
  switch (picking.value) {
    case 'skill':
      toggleList('freeSkills', id)
      break
    case 'group':
      toggleList('freeSkillGroups', id)
      break
    case 'spells':
    case 'rituals':
      toggleFormula(picking.value, id)
      break
    case 'complexForms':
      toggleList('complexForms', id)
      break
    case 'power':
      addPower(id)
      break
  }
  picking.value = undefined
}

const powerPoints = computed(() => props.derived?.budgets.powerPoints)
const num = (x: number) => String(x).replace('.', ',')

useFooter({
  status: computed(() => {
    if (!letter.value) return 'Falta a prioridade de Magia ou Ressonância.'
    if (!magic.value.awakening) return 'Mundano: nada a escolher neste passo.'
    const pp = powerPoints.value
    if (pp && pp.total - pp.spent > 0) return `Sobra ${num(pp.total - pp.spent)} de ponto de poder.`
    return `${nameOf(c.awakenings, magic.value.awakening)} com ${entry.value?.attribute.id === 'res' ? 'Ressonância' : 'Magia'} ${entry.value?.attribute.id === 'res' ? res.value : mag.value}.`
  }),
  alert: computed(() => (props.violations[0] ? magicMessage(c, props.violations[0]) : '')),
})
</script>

<template>
  <p v-if="!letter" class="intro">
    O que dá para escolher aqui depende da letra da coluna Magia ou Ressonância. Volte às
    prioridades e escolha uma.
  </p>
  <template v-else>
    <section class="block">
      <h2 :id="`${uid}-awakening`" class="small">O que a prioridade {{ letter }} dá</h2>
      <div role="radiogroup" :aria-labelledby="`${uid}-awakening`">
        <button
          v-for="e in [...entries, undefined]"
          :key="e?.awakening ?? 'mundane'"
          type="button"
          role="radio"
          class="option"
          :aria-checked="(magic.awakening ?? '') === (e?.awakening ?? '')"
          @click="setAwakening(e?.awakening ?? '')"
        >
          <span class="ring" aria-hidden="true"><span /></span>
          <span class="text">
            <span class="name">{{ e ? nameOf(c.awakenings, e.awakening) : 'Mundano' }}</span>
            <span class="detail">{{ e ? givesOf(e) : 'Sem magia nem ressonância.' }}</span>
          </span>
        </button>
      </div>
    </section>

    <section v-if="has('tradition')" class="block">
      <h2 :id="`${uid}-tradition`">Tradição</h2>
      <div role="radiogroup" :aria-labelledby="`${uid}-tradition`">
        <button
          v-for="t in c.traditions"
          :key="t.id"
          type="button"
          role="radio"
          class="option"
          :aria-checked="magic.tradition === t.id"
          @click="update((m) => (m.tradition = t.id))"
        >
          <span class="ring" aria-hidden="true"><span /></span>
          <span class="name">{{ t.name }}</span>
        </button>
      </div>
    </section>

    <section v-if="has('aspect')" class="block">
      <h2 :id="`${uid}-aspect`">Aspecto</h2>
      <div role="radiogroup" :aria-labelledby="`${uid}-aspect`">
        <button
          v-for="a in aspects"
          :key="a"
          type="button"
          role="radio"
          class="option"
          :aria-checked="magic.aspect === a"
          @click="update((m) => (m.aspect = a))"
        >
          <span class="ring" aria-hidden="true"><span /></span>
          <span class="name">{{ nameOf(c.groups, a) }}</span>
        </button>
      </div>
    </section>

    <section v-if="has('mentorAdvantage') && mentor" class="block">
      <h2 :id="`${uid}-mentor`">Vantagem do espírito mentor</h2>
      <div role="radiogroup" :aria-labelledby="`${uid}-mentor`">
        <button
          v-for="[id, name] in [
            ['magician', 'Vantagem de mago'],
            ['adept', 'Vantagem de adepto'],
          ]"
          :key="id"
          type="button"
          role="radio"
          class="option"
          :aria-checked="magic.mentorAdvantage === id"
          @click="update((m) => (m.mentorAdvantage = id))"
        >
          <span class="ring" aria-hidden="true"><span /></span>
          <span class="name">{{ name }}</span>
        </button>
      </div>
    </section>

    <section v-if="freeRule" class="block">
      <h2>
        {{
          magic.awakening === 'aspected-magician'
            ? 'Grupo dado pela prioridade'
            : 'Perícias dadas pela prioridade'
        }}
      </h2>
      <p class="detail">
        {{ freeChosen.length }} de {{ freeRule.count }}, no nível {{ freeRule.rating }}, antes dos
        pontos de perícia.
      </p>
      <ul>
        <li v-for="id in freeChosen" :key="id" class="row">
          <span class="text">
            <span class="name pen">{{ nameOf([...c.skills, ...c.groups], id) }}</span>
          </span>
          <button
            type="button"
            class="remove"
            @click="
              toggleList(
                magic.awakening === 'aspected-magician' ? 'freeSkillGroups' : 'freeSkills',
                id,
              )
            "
          >
            Tirar
          </button>
        </li>
      </ul>
      <button
        v-if="freeChosen.length < freeRule.count"
        type="button"
        class="add"
        @click="picking = magic.awakening === 'aspected-magician' ? 'group' : 'skill'"
      >
        {{ magic.awakening === 'aspected-magician' ? 'Escolher grupo' : 'Escolher perícia' }}
      </button>
    </section>

    <section v-if="has('formulas')" class="block">
      <h2>Fórmulas</h2>
      <p class="detail numeric">
        {{ formulaCount(magic) }} de {{ entry?.formulas ?? 0 }} gratuitas; as outras custam 5 de
        carma. Máximo {{ formulaMax }} de cada tipo.
      </p>
      <ul>
        <li v-for="id in magic.formulas?.spells ?? []" :key="`s-${id}`" class="row">
          <span class="text">
            <span class="name pen">{{ nameOf(c.spells, id) }}</span>
            <span class="detail">Feitiço</span>
          </span>
          <button type="button" class="remove" @click="toggleFormula('spells', id)">Tirar</button>
        </li>
        <li v-for="id in magic.formulas?.rituals ?? []" :key="`r-${id}`" class="row">
          <span class="text">
            <span class="name pen">{{ nameOf(c.rituals, id) }}</span>
            <span class="detail">Ritual</span>
          </span>
          <button type="button" class="remove" @click="toggleFormula('rituals', id)">Tirar</button>
        </li>
      </ul>
      <div class="actions">
        <button type="button" class="add" @click="picking = 'spells'">Adicionar feitiço</button>
        <button type="button" class="add" @click="picking = 'rituals'">Adicionar ritual</button>
      </div>
    </section>

    <section v-if="has('complexForms')" class="block">
      <h2>Formas complexas</h2>
      <p class="detail numeric">
        {{ magic.complexForms?.length ?? 0 }} de {{ entry?.complexForms ?? 0 }} gratuitas; as outras
        custam 4 de carma. Máximo {{ formsMax }}.
      </p>
      <ul>
        <li v-for="id in magic.complexForms ?? []" :key="id" class="row">
          <span class="text"
            ><span class="name pen">{{ nameOf(c.complexForms, id) }}</span></span
          >
          <button type="button" class="remove" @click="toggleList('complexForms', id)">
            Tirar
          </button>
        </li>
      </ul>
      <button type="button" class="add" @click="picking = 'complexForms'">
        Adicionar forma complexa
      </button>
    </section>

    <section v-if="has('powers')" class="block">
      <h2>Poderes de adepto</h2>
      <div
        v-if="has('powerPointsKarma')"
        class="stepper"
        role="group"
        :aria-label="'Pontos de poder comprados'"
      >
        <span class="detail grow"
          >Pontos de poder comprados, a 5 de carma cada (até {{ mag }})</span
        >
        <button
          type="button"
          aria-label="Comprar menos um ponto de poder"
          :disabled="!magic.powerPointsKarma"
          @click="update((m) => (m.powerPointsKarma = (m.powerPointsKarma ?? 0) - 1))"
        >
          −
        </button>
        <output class="numeric">{{ magic.powerPointsKarma ?? 0 }}</output>
        <button
          type="button"
          aria-label="Comprar mais um ponto de poder"
          :disabled="(magic.powerPointsKarma ?? 0) >= mag"
          @click="update((m) => (m.powerPointsKarma = (m.powerPointsKarma ?? 0) + 1))"
        >
          +
        </button>
      </div>
      <BudgetBoxes
        v-if="powerPoints"
        label="Pontos de poder"
        :total="powerPoints.total"
        :spent="powerPoints.spent"
        quarters
      />
      <ul>
        <li v-for="p in magic.powers ?? []" :key="p.key">
          <button
            type="button"
            class="row"
            :aria-expanded="expanded === p.key"
            @click="expanded = expanded === p.key ? undefined : p.key"
          >
            <span class="text">
              <span class="name pen">{{ nameOf(c.adeptPowers, p.id) }}</span>
              <span class="detail">
                {{
                  [
                    typeof powerOf(p.id)?.powerPoints === 'number' ? '' : `Nível ${p.rating ?? 1}`,
                    p.parameter
                      ? parameterOptions(p.id).find((o) => o.id === p.parameter)?.name
                      : '',
                  ]
                    .filter(Boolean)
                    .join('; ') || 'Sem nível'
                }}
              </span>
            </span>
            <span class="numeric cost">{{ num(powerCost(powerOf(p.id)!, p.rating ?? 1)) }}</span>
          </button>
          <div v-if="expanded === p.key" class="editor">
            <div
              v-if="typeof powerOf(p.id)?.powerPoints !== 'number'"
              class="stepper"
              role="group"
              :aria-label="`Nível de ${nameOf(c.adeptPowers, p.id)}`"
            >
              <button
                type="button"
                :aria-label="`Baixar o nível de ${nameOf(c.adeptPowers, p.id)}`"
                :disabled="(p.rating ?? 1) <= 1"
                @click="changePower(p.key, { rating: (p.rating ?? 1) - 1 })"
              >
                −
              </button>
              <output class="numeric">{{ p.rating ?? 1 }}</output>
              <button
                type="button"
                :aria-label="`Subir o nível de ${nameOf(c.adeptPowers, p.id)}`"
                @click="changePower(p.key, { rating: (p.rating ?? 1) + 1 })"
              >
                +
              </button>
            </div>
            <template v-if="powerOf(p.id)?.parameter">
              <label class="label" :for="`${uid}-${p.key}-param`">Alvo</label>
              <select
                :id="`${uid}-${p.key}-param`"
                :value="p.parameter ?? ''"
                @change="
                  changePower(p.key, {
                    parameter: ($event.target as HTMLSelectElement).value || undefined,
                  })
                "
              >
                <option value="">Escolha…</option>
                <option v-for="o in parameterOptions(p.id)" :key="o.id" :value="o.id">
                  {{ o.name }}
                </option>
              </select>
            </template>
            <NxButton
              variant="text"
              class="remove"
              @click="update((m) => (m.powers = (m.powers ?? []).filter((x) => x.key !== p.key)))"
            >
              Remover {{ nameOf(c.adeptPowers, p.id) }}
            </NxButton>
          </div>
        </li>
      </ul>
      <button type="button" class="add" @click="picking = 'power'">Adicionar poder</button>
    </section>
  </template>

  <PickerSheet
    :open="!!picking"
    :title="pickerTitle"
    :items="pickerItems"
    @close="picking = undefined"
  >
    <template #action="{ item }">
      <NxButton @click="pick(item.id)">Adicionar</NxButton>
    </template>
  </PickerSheet>
</template>

<style scoped>
.intro {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

h2 {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
}

h2.small {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.option,
.row {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border: 0;
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

li.row {
  cursor: default;
}

.ring {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: 50%;
}

.ring span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

[aria-checked='true'] .ring {
  border-color: var(--sr-pen);
}

[aria-checked='true'] .ring span {
  background: var(--sr-pen);
}

[aria-checked='true'] .name,
.pen {
  color: var(--sr-pen);
}

.text {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.name {
  font-size: var(--text-md);
  font-weight: 600;
}

.detail {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.4;
  color: var(--color-text-muted);
}

.grow {
  flex-grow: 1;
}

.cost {
  font-size: var(--text-sm);
  font-weight: 600;
}

.editor {
  padding: 0 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.stepper button {
  width: var(--touch-min);
  height: var(--touch-min);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: 1.375rem;
  cursor: pointer;
}

.stepper button:disabled {
  border-color: var(--color-surface-sunken);
  background: transparent;
  color: var(--color-rule);
  cursor: not-allowed;
}

.stepper output {
  min-width: 2ch;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--sr-pen);
}

select {
  height: var(--touch-min);
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font: inherit;
}

.remove {
  min-height: var(--touch-min);
  padding: 0 var(--space-2);
  border: 0;
  background: transparent;
  color: var(--color-danger);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.editor .remove {
  align-self: flex-start;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.add {
  align-self: flex-start;
  min-height: var(--touch-min);
  padding: 0 14px;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}
</style>
