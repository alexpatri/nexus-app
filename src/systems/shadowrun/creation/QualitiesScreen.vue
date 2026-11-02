<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Violation } from '@/core/rules/system'
import NxButton from '@/core/ui/NxButton.vue'
import type { Derived } from '../rules'
import { choicesFor, qualityCost, qualityKarma } from '../rules/qualities'
import type { QualityItem } from '../rules/validate'
import BudgetBoxes from '../ui/BudgetBoxes.vue'
import PickerSheet, { type PickerItem } from '../ui/PickerSheet.vue'
import { nameOf, useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { newKey } from './keys'
import { choiceOptions, detailOf, priceOf, qualityMessage, type UiQuality } from './qualities'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
}>()

const c = useCatalogs()
type Side = 'positive' | 'negative'

const items = computed(() => (props.data.qualities ?? []) as QualityItem[])
const byId = (id: string) => c.qualities.find((q) => q.id === id)
const budgets = computed(() => props.derived?.budgets)
const karma = computed(() => budgets.value?.karma)
const negatives = computed(() => budgets.value?.negativeQualities?.spent ?? 0)

const expanded = ref<string>()
const picking = ref<Side>()

const sides = computed(() =>
  (['positive', 'negative'] as Side[]).map((kind) => ({
    kind,
    title: kind === 'positive' ? 'Positivas' : 'Negativas',
    unit: kind === 'positive' ? 'custa' : 'dá',
    add: kind === 'positive' ? 'Adicionar positiva' : 'Adicionar negativa',
    budget: budgets.value?.[kind === 'positive' ? 'positiveQualities' : 'negativeQualities'],
    items: items.value
      .map((it) => ({ it, q: byId(it.id) }))
      .filter((x): x is { it: QualityItem; q: UiQuality } => x.q?.kind === kind),
  })),
)

// Violações por item, para marcar a linha e explicar abaixo do nome.
const problems = computed(() => {
  const out = new Map<string, string>()
  for (const v of props.violations) {
    const key = /^qualities\[([^\]]+)\]/.exec(v.path)?.[1]
    if (key && !out.has(key)) out.set(key, qualityMessage(c, v, props.data.metatype as string))
  }
  return out
})

function change(key: string, update: (it: QualityItem) => void) {
  props.edit((data) => {
    const list = (data.qualities as QualityItem[]).map((it) => ({ ...it }))
    const it = list.find((x) => x.key === key)!
    update(it)
    data.qualities = list
  })
}

function remove(key: string) {
  props.edit((data) => {
    const list = (data.qualities as QualityItem[]).filter((x) => x.key !== key)
    if (list.length > 0) data.qualities = list
    else delete data.qualities
  })
  expanded.value = undefined
}

function add(q: UiQuality) {
  const key = newKey(props.data)
  props.edit((data) => {
    const it: QualityItem = { key, id: q.id }
    if (q.levels) it.rating = 1
    data.qualities = [...((data.qualities as QualityItem[] | undefined) ?? []), it]
  })
  picking.value = undefined
  // Opção, escolha e nível se ajustam na própria linha, que já abre.
  expanded.value = key
}

const has = (id: string) => items.value.some((it) => it.id === id)

function blockedReason(q: UiQuality, left: number): string | undefined {
  const r = q.requires
  if (r?.metatype?.length && !r.metatype.includes(props.data.metatype as string)) {
    return `Só para ${r.metatype.map((m) => nameOf(c.metatypes, m).toLocaleLowerCase('pt-BR')).join(', ')}`
  }
  if (r?.special === 'mag') return 'Só para despertos'
  if (r?.special === 'res') return 'Só para tecnomantes'
  // Com escolha, a mesma qualidade pode voltar com outro alvo.
  if (has(q.id) && (q.unique || !choicesFor(c.lookup, q))) return 'Já está na ficha'
  if (priceOf(q).min > left) return `Passa do limite de 25`
}

const pickerItems = computed<(PickerItem & { quality: UiQuality })[]>(() => {
  const side = picking.value
  if (!side) return []
  const b =
    side === 'positive' ? budgets.value?.positiveQualities : budgets.value?.negativeQualities
  const left = (b?.total ?? 25) - (b?.spent ?? 0)
  return c.qualities
    .filter((q) => q.kind === side)
    .map((q) => ({
      id: q.id,
      name: q.name,
      note: q.levels ? `Até o nível ${q.levels.max}` : 'Sem nível',
      price: priceOf(q).text,
      blocked: blockedReason(q, left),
      description: q.desc,
      quality: q,
    }))
})

type Option = { id: string; name: string; karma: number }

// As opções do karma, com nome, nas formas por opção e por soma.
const optionsOf = (q: UiQuality) => qualityCost(q).options as Option[] | undefined
const groupsOf = (q: UiQuality) =>
  (qualityCost(q).sum ?? []) as { id: string; name: string; options: Option[] }[]

function actionLabel(q: UiQuality) {
  const cost = qualityCost(q)
  if (cost.perLevel) return `Adicionar nível 1 por ${cost.perLevel} de carma`
  if (cost.options || cost.sum) return 'Adicionar e escolher a opção'
  return `Adicionar por ${cost.fixed} de carma`
}

useFooter({
  status: computed(() =>
    karma.value ? `Carma: ${karma.value.spent} gastos de ${karma.value.total}` : '',
  ),
  alert: computed(() => {
    const v = props.violations.find((x) => x.code === 'budget.exceeded') ?? props.violations[0]
    return v ? qualityMessage(c, v, props.data.metatype as string) : ''
  }),
})
</script>

<template>
  <p class="intro">
    Positivas custam carma; negativas dão carma. Cada lado vai até 25.
    <template v-if="karma">
      O personagem tem {{ karma.total }} de carma: 25 iniciais e {{ negatives }} das negativas.
    </template>
  </p>

  <section v-for="side in sides" :key="side.kind" class="side">
    <h2>{{ side.title }}</h2>
    <BudgetBoxes
      v-if="side.budget"
      :label="`Carma em ${side.title.toLocaleLowerCase('pt-BR')}`"
      :total="side.budget.total"
      :spent="side.budget.spent"
    />
    <ul>
      <li v-for="{ it, q } in side.items" :key="it.key" :class="{ flagged: problems.has(it.key) }">
        <button
          type="button"
          class="row"
          :aria-expanded="expanded === it.key"
          @click="expanded = expanded === it.key ? undefined : it.key"
        >
          <span class="text">
            <span class="name">{{ q.name }}</span>
            <span class="detail">{{ detailOf(c, q, it) }}</span>
            <span v-if="problems.has(it.key)" class="problem">{{ problems.get(it.key) }}</span>
          </span>
          <span class="karma">
            <span class="numeric">{{ qualityKarma(q, it) }}</span>
            <span class="unit">{{ side.unit }}</span>
          </span>
        </button>

        <div v-if="expanded === it.key" class="editor">
          <div v-if="q.levels" class="field">
            <span class="label" :id="`${it.key}-level`">Nível</span>
            <div class="stepper" role="group" :aria-labelledby="`${it.key}-level`">
              <button
                type="button"
                :aria-label="`Baixar o nível de ${q.name}`"
                :disabled="(it.rating ?? 1) <= 1"
                @click="change(it.key, (x) => (x.rating = (x.rating ?? 1) - 1))"
              >
                −
              </button>
              <output class="numeric">{{ it.rating ?? 1 }}</output>
              <button
                type="button"
                :aria-label="`Subir o nível de ${q.name}`"
                :disabled="(it.rating ?? 1) >= q.levels.max"
                @click="change(it.key, (x) => (x.rating = (x.rating ?? 1) + 1))"
              >
                +
              </button>
            </div>
          </div>

          <fieldset v-if="optionsOf(q)" class="field">
            <legend class="label">Opção</legend>
            <label v-for="o in optionsOf(q)" :key="o.id">
              <input
                type="radio"
                :name="`${it.key}-option`"
                :checked="it.option === o.id"
                @change="change(it.key, (x) => (x.option = o.id))"
              />
              {{ o.name }} <span class="numeric">({{ o.karma }})</span>
            </label>
          </fieldset>

          <fieldset v-for="g in groupsOf(q)" :key="g.id" class="field">
            <legend class="label">{{ g.name }}</legend>
            <label v-for="o in g.options" :key="o.id">
              <input
                type="radio"
                :name="`${it.key}-${g.id}`"
                :checked="it.options?.[g.id] === o.id"
                @change="change(it.key, (x) => (x.options = { ...x.options, [g.id]: o.id }))"
              />
              {{ o.name }} <span class="numeric">({{ o.karma }})</span>
            </label>
          </fieldset>

          <div v-if="choiceOptions(c, q)" class="field">
            <label class="label" :for="`${it.key}-choice`">Escolha</label>
            <select
              :id="`${it.key}-choice`"
              :value="it.choice ?? ''"
              @change="
                change(
                  it.key,
                  (x) => (x.choice = ($event.target as HTMLSelectElement).value || undefined),
                )
              "
            >
              <option value="">Escolha…</option>
              <option v-for="o in choiceOptions(c, q)" :key="o.id" :value="o.id">
                {{ o.name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="label" :for="`${it.key}-notes`">Anotação</label>
            <input
              :id="`${it.key}-notes`"
              type="text"
              :value="it.notes ?? ''"
              @change="
                change(
                  it.key,
                  (x) => (x.notes = ($event.target as HTMLInputElement).value || undefined),
                )
              "
            />
          </div>

          <NxButton variant="text" class="remove" @click="remove(it.key)"
            >Remover {{ q.name }}</NxButton
          >
        </div>
      </li>
    </ul>
    <button type="button" class="add" @click="picking = side.kind">{{ side.add }}</button>
  </section>

  <PickerSheet
    :open="!!picking"
    :title="picking === 'negative' ? 'Qualidade negativa' : 'Qualidade positiva'"
    :items="pickerItems"
    @close="picking = undefined"
  >
    <template #action="{ item }">
      <NxButton @click="add(item.quality)">{{ actionLabel(item.quality) }}</NxButton>
    </template>
  </PickerSheet>
</template>

<style scoped>
.intro {
  margin: 0 0 var(--space-5);
  font-size: var(--text-sm);
  line-height: 1.5;
  max-width: 34em;
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

.row {
  width: 100%;
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.text {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--sr-pen);
}

.detail,
.unit {
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

.karma {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.karma .numeric {
  font-size: 1.0625rem;
  font-weight: 700;
}

.editor {
  padding: 0 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field {
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

fieldset label {
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

select,
input[type='text'] {
  height: var(--touch-min);
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font: inherit;
}

.remove {
  align-self: flex-start;
  color: var(--color-danger);
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
