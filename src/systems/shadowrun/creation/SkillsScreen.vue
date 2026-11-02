<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import type { Violation } from '@/core/rules/system'
import NxButton from '@/core/ui/NxButton.vue'
import type { Derived } from '../rules'
import type { Rated } from '../rules/skills'
import type { Sheet, SkillBuy } from '../rules/validate'
import BudgetBoxes from '../ui/BudgetBoxes.vue'
import PickerSheet, { type PickerItem } from '../ui/PickerSheet.vue'
import { nameOf, useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { newKey } from './keys'
import { abbrOf, skillMessage } from './skills'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
}>()

const c = useCatalogs()
const uid = useId()
type Tab = 'active' | 'groups' | 'knowledge' | 'languages'
const tab = ref<Tab>('active')
const expanded = ref<string>()
const picking = ref<'skill' | 'group'>()
const adding = ref(false)
const draftName = ref('')
const draftCategory = ref('street')
const draftNative = ref(false)

const skills = computed(() => ((props.data as Sheet).skills ?? {}) as NonNullable<Sheet['skills']>)
const out = computed(() => props.derived?.skills)
const budgets = computed(() => props.derived?.budgets)
const skillMax = (id: string) => c.skillMaxRating + aptitude(id)
const aptitude = (id: string) =>
  ((props.data as Sheet).qualities ?? []).some((q) => q.id === 'aptitude' && q.choice === id)
    ? 1
    : 0

const tabs = computed(() =>
  (
    [
      ['active', 'Ativas', 'skills'],
      ['groups', 'Grupos', 'skillGroups'],
      ['knowledge', 'Conhecimento', 'knowledge'],
      ['languages', 'Idiomas', 'knowledge'],
    ] as const
  ).map(([id, name, budget]) => {
    const b = budgets.value?.[budget]
    return { id, name, budget: b, label: b ? `${b.spent} de ${b.total}` : '' }
  }),
)
const current = computed(() => tabs.value.find((t) => t.id === tab.value)!)

// Edição de uma seção de skills, limpando o que fica vazio ("ausente é zero").
function update(change: (s: NonNullable<Sheet['skills']>) => void) {
  props.edit((data) => {
    const s = JSON.parse(JSON.stringify(data.skills ?? {})) as NonNullable<Sheet['skills']>
    change(s)
    for (const k of ['active', 'groups'] as const) {
      if (s[k] && Object.keys(s[k]!).length === 0) delete s[k]
    }
    for (const k of ['knowledge', 'languages'] as const) if (s[k]?.length === 0) delete s[k]
    if (Object.keys(s).length > 0) data.skills = s
    else delete data.skills
  })
}

const groupOf = (id: string) => c.skills.find((s) => s.id === id)?.group ?? ''
const groupBought = (id: string) => !!skills.value.groups?.[groupOf(id)]

const activeRows = computed(() =>
  Object.entries(skills.value.active ?? {})
    .map(([id, b]) => {
      const sk = c.skills.find((s) => s.id === id)
      const r: Rated | undefined = out.value?.active?.[id]
      const spec = b.specialization?.name
      return {
        id,
        b,
        name: sk?.name ?? id,
        detail: [abbrOf(c, sk?.attribute), spec && `especialização: ${spec}`]
          .filter(Boolean)
          .join('; '),
        rating: r?.rating ?? 0,
        pool: r?.pool,
        specializations: sk?.specializations ?? [],
      }
    })
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'pt-BR')),
)

const groupRows = computed(() =>
  Object.entries(skills.value.groups ?? {}).map(([id, b]) => {
    const g = c.groups.find((x) => x.id === id)
    const members = (g?.skills ?? []).map((m) => {
      const r = out.value?.active?.[m]
      return `${nameOf(c.skills, m)} ${r?.pool ?? r?.rating ?? ''}`.trim()
    })
    return {
      id,
      b,
      name: g?.name ?? id,
      detail: `Paradas: ${members.join(', ')}`,
      rating: (b.points ?? 0) + (b.karma ?? 0),
    }
  }),
)

const knowledgeRows = computed(() =>
  (skills.value.knowledge ?? []).map((k) => {
    const cat = c.knowledgeCategories.find((x) => x.id === k.category)
    const r = out.value?.knowledge?.[k.key]
    return {
      k,
      detail: `${cat?.name ?? k.category}; ${abbrOf(c, cat?.attribute)}`,
      rating: r?.rating ?? 0,
      pool: r?.pool,
    }
  }),
)

const languageRows = computed(() =>
  (skills.value.languages ?? []).map((l) => {
    const r = out.value?.languages?.[l.key]
    return {
      l,
      detail: l.native ? 'Nativo' : abbrOf(c, 'int'),
      rating: l.native ? 'N' : String(r?.rating ?? 0),
      pool: r?.pool,
    }
  }),
)

function setPoints(id: string, points: number) {
  update((s) => {
    const b: SkillBuy = { ...s.active?.[id], points }
    if (!points) delete b.points
    s.active = { ...s.active }
    if (Object.keys(b).length) s.active[id] = b
    else delete s.active[id]
  })
}

function removeSkill(id: string) {
  update((s) => {
    s.active = { ...s.active }
    delete s.active[id]
  })
  expanded.value = undefined
}

function setSpecialization(id: string, name: string) {
  update((s) => {
    const b: SkillBuy = { ...s.active?.[id] }
    if (name.trim()) b.specialization = { name: name.trim(), paidWith: 'points' }
    else delete b.specialization
    s.active = { ...s.active, [id]: b }
  })
}

function setGroup(id: string, points: number) {
  update((s) => {
    s.groups = { ...s.groups }
    if (points > 0) s.groups[id] = { ...s.groups[id], points }
    else delete s.groups[id]
  })
}

function setListItem(list: 'knowledge' | 'languages', key: string, patch: Record<string, unknown>) {
  update((s) => {
    const items = (s[list] ?? []) as unknown as Record<string, unknown>[]
    s[list] = items.map((x) => {
      if (x.key !== key) return x
      const next: Record<string, unknown> = { ...x, ...patch }
      // Ausente é zero ou vazio: campo zerado sai do data.
      for (const [k, v] of Object.entries(next)) {
        if (v === undefined || v === 0 || v === false) delete next[k]
      }
      return next
    }) as never
  })
}

function removeListItem(list: 'knowledge' | 'languages', key: string) {
  update((s) => {
    s[list] = ((s[list] ?? []) as { key: string }[]).filter((x) => x.key !== key) as never
  })
  expanded.value = undefined
}

function addListItem() {
  const name = draftName.value.trim()
  if (!name) return
  const key = newKey(props.data)
  update((s) => {
    if (tab.value === 'knowledge') {
      s.knowledge = [
        ...(s.knowledge ?? []),
        { key, name, category: draftCategory.value, points: 1 },
      ]
    } else {
      const lang = draftNative.value
        ? { key, name, native: true as const }
        : { key, name, points: 1 }
      s.languages = [...(s.languages ?? []), lang]
    }
  })
  draftName.value = ''
  adding.value = false
}

function startAdding() {
  adding.value = true
  draftNative.value = !(skills.value.languages ?? []).some((l) => l.native)
}

const skillItems = computed<PickerItem[]>(() =>
  [...c.skills]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((s) => ({
      id: s.id,
      name: s.name,
      note: `${abbrOf(c, s.attribute)}${s.group ? `; grupo ${nameOf(c.groups, s.group)}` : ''}`,
      price: '',
      blocked: s.restricted
        ? s.category === 'resonance'
          ? 'Só para tecnomantes'
          : 'Só para despertos'
        : groupBought(s.id)
          ? `Grupo ${nameOf(c.groups, s.group ?? '')} já comprado`
          : skills.value.active?.[s.id]
            ? 'Já está na ficha'
            : undefined,
    })),
)

const groupItems = computed<PickerItem[]>(() =>
  [...c.groups]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((g) => ({
      id: g.id,
      name: g.name,
      note: g.skills.map((m) => nameOf(c.skills, m)).join(', '),
      price: '',
      blocked: skills.value.groups?.[g.id]
        ? 'Já está na ficha'
        : g.skills.some((m) => c.skills.find((s) => s.id === m)?.restricted)
          ? 'Só para despertos'
          : g.skills.some((m) => (skills.value.active?.[m]?.points ?? 0) > 0)
            ? 'Uma perícia do grupo já tem pontos'
            : undefined,
    })),
)

function pick(id: string) {
  if (picking.value === 'group') setGroup(id, 1)
  else setPoints(id, 1)
  picking.value = undefined
  expanded.value = id
}

const left = (b?: { total: number; spent: number }) => (b ? b.total - b.spent : 0)

useFooter({
  status: computed(() => {
    const b = current.value.budget
    if (!b) return ''
    const n = left(b)
    if (n > 0) return `Sobram ${n} ${n === 1 ? 'ponto' : 'pontos'}. Você pode voltar depois.`
    if (n === 0) return 'Todos os pontos distribuídos.'
    return `Tire ${-n} para caber no orçamento.`
  }),
  alert: computed(() => {
    const v = props.violations.find((x) => x.code !== 'budget.exceeded') ?? props.violations[0]
    return v ? skillMessage(c, v) : ''
  }),
})

const hints: Record<Tab, string> = {
  active: 'Até o nível 6. Especialização custa 1 ponto e dá +2 dados na área escolhida.',
  groups:
    'O grupo sobe todas as perícias dele juntas. Perícia de grupo comprado não recebe pontos nem especialização à parte.',
  knowledge: 'Pontos de conhecimento: (INT + LÓG) × 2, divididos com os idiomas.',
  languages: 'Um idioma nativo de graça. Os outros saem dos pontos de conhecimento.',
}
</script>

<template>
  <div role="tablist" aria-label="Tipos de perícia" class="tabs">
    <button
      v-for="t in tabs"
      :id="`${uid}-${t.id}`"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="tab === t.id"
      :aria-controls="`${uid}-panel`"
      @click="((tab = t.id), (expanded = undefined), (adding = false))"
    >
      <span>{{ t.name }}</span>
      <span class="tab-budget numeric">{{ t.label }}</span>
    </button>
  </div>

  <section :id="`${uid}-panel`" role="tabpanel" :aria-labelledby="`${uid}-${tab}`" class="panel">
    <p class="hint">{{ hints[tab] }}</p>
    <BudgetBoxes
      v-if="current.budget"
      :label="
        current.id === 'active'
          ? 'Pontos de perícia'
          : current.id === 'groups'
            ? 'Pontos de grupo'
            : 'Pontos de conhecimento'
      "
      :total="current.budget.total"
      :spent="current.budget.spent"
    />

    <ul>
      <template v-if="tab === 'active'">
        <li v-for="r in activeRows" :key="r.id">
          <button
            type="button"
            class="row"
            :aria-expanded="expanded === r.id"
            @click="expanded = expanded === r.id ? undefined : r.id"
          >
            <span class="text">
              <span class="name">{{ r.name }}</span>
              <span class="detail">{{ r.detail }}</span>
            </span>
            <span class="rating numeric">{{ r.rating }}</span>
            <span class="pool">
              <span class="numeric">{{ r.pool ?? '—' }}</span>
              <span class="unit">dados</span>
            </span>
          </button>
          <div v-if="expanded === r.id" class="editor">
            <div class="stepper" role="group" :aria-label="`Pontos em ${r.name}`">
              <button
                type="button"
                :aria-label="`Baixar ${r.name}`"
                :disabled="!r.b.points"
                @click="setPoints(r.id, (r.b.points ?? 0) - 1)"
              >
                −
              </button>
              <output class="numeric">{{ r.b.points ?? 0 }}</output>
              <button
                type="button"
                :aria-label="`Subir ${r.name}`"
                :disabled="r.rating >= skillMax(r.id)"
                @click="setPoints(r.id, (r.b.points ?? 0) + 1)"
              >
                +
              </button>
            </div>
            <label class="label" :for="`${uid}-${r.id}-spec`">Especialização (1 ponto)</label>
            <input
              :id="`${uid}-${r.id}-spec`"
              type="text"
              :list="`${uid}-${r.id}-specs`"
              :value="r.b.specialization?.name ?? ''"
              @change="setSpecialization(r.id, ($event.target as HTMLInputElement).value)"
            />
            <datalist :id="`${uid}-${r.id}-specs`">
              <option v-for="s in r.specializations" :key="s" :value="s" />
            </datalist>
            <NxButton variant="text" class="remove" @click="removeSkill(r.id)"
              >Remover {{ r.name }}</NxButton
            >
          </div>
        </li>
      </template>

      <template v-else-if="tab === 'groups'">
        <li v-for="g in groupRows" :key="g.id">
          <button
            type="button"
            class="row"
            :aria-expanded="expanded === g.id"
            @click="expanded = expanded === g.id ? undefined : g.id"
          >
            <span class="text">
              <span class="name">{{ g.name }}</span>
              <span class="detail">{{ g.detail }}</span>
            </span>
            <span class="rating numeric">{{ g.rating }}</span>
          </button>
          <div v-if="expanded === g.id" class="editor">
            <div class="stepper" role="group" :aria-label="`Pontos no grupo ${g.name}`">
              <button
                type="button"
                :aria-label="`Baixar ${g.name}`"
                :disabled="!g.b.points"
                @click="setGroup(g.id, (g.b.points ?? 0) - 1)"
              >
                −
              </button>
              <output class="numeric">{{ g.b.points ?? 0 }}</output>
              <button
                type="button"
                :aria-label="`Subir ${g.name}`"
                :disabled="g.rating >= c.skillMaxRating"
                @click="setGroup(g.id, (g.b.points ?? 0) + 1)"
              >
                +
              </button>
            </div>
            <NxButton variant="text" class="remove" @click="setGroup(g.id, 0)"
              >Remover {{ g.name }}</NxButton
            >
          </div>
        </li>
      </template>

      <template v-else-if="tab === 'knowledge'">
        <li v-for="{ k, detail, rating, pool } in knowledgeRows" :key="k.key">
          <button
            type="button"
            class="row"
            :aria-expanded="expanded === k.key"
            @click="expanded = expanded === k.key ? undefined : k.key"
          >
            <span class="text">
              <span class="name">{{ k.name }}</span>
              <span class="detail">{{ detail }}</span>
            </span>
            <span class="rating numeric">{{ rating }}</span>
            <span class="pool">
              <span class="numeric">{{ pool ?? '—' }}</span>
              <span class="unit">dados</span>
            </span>
          </button>
          <div v-if="expanded === k.key" class="editor">
            <div class="stepper" role="group" :aria-label="`Pontos em ${k.name}`">
              <button
                type="button"
                :aria-label="`Baixar ${k.name}`"
                :disabled="(k.points ?? 0) <= 1"
                @click="setListItem('knowledge', k.key, { points: (k.points ?? 0) - 1 })"
              >
                −
              </button>
              <output class="numeric">{{ k.points ?? 0 }}</output>
              <button
                type="button"
                :aria-label="`Subir ${k.name}`"
                :disabled="rating >= c.skillMaxRating"
                @click="setListItem('knowledge', k.key, { points: (k.points ?? 0) + 1 })"
              >
                +
              </button>
            </div>
            <NxButton variant="text" class="remove" @click="removeListItem('knowledge', k.key)"
              >Remover {{ k.name }}</NxButton
            >
          </div>
        </li>
      </template>

      <template v-else>
        <li v-for="{ l, detail, rating, pool } in languageRows" :key="l.key">
          <button
            type="button"
            class="row"
            :aria-expanded="expanded === l.key"
            @click="expanded = expanded === l.key ? undefined : l.key"
          >
            <span class="text">
              <span class="name">{{ l.name }}</span>
              <span class="detail">{{ detail }}</span>
            </span>
            <span class="rating numeric">{{ rating }}</span>
            <span class="pool">
              <span class="numeric">{{ pool ?? '—' }}</span>
              <span class="unit">dados</span>
            </span>
          </button>
          <div v-if="expanded === l.key" class="editor">
            <label class="check">
              <input
                type="checkbox"
                :checked="!!l.native"
                @change="
                  setListItem(
                    'languages',
                    l.key,
                    ($event.target as HTMLInputElement).checked
                      ? { native: true, points: undefined }
                      : { native: undefined, points: 1 },
                  )
                "
              />
              Idioma nativo
            </label>
            <div v-if="!l.native" class="stepper" role="group" :aria-label="`Pontos em ${l.name}`">
              <button
                type="button"
                :aria-label="`Baixar ${l.name}`"
                :disabled="(l.points ?? 0) <= 1"
                @click="setListItem('languages', l.key, { points: (l.points ?? 0) - 1 })"
              >
                −
              </button>
              <output class="numeric">{{ l.points ?? 0 }}</output>
              <button
                type="button"
                :aria-label="`Subir ${l.name}`"
                :disabled="(l.points ?? 0) >= c.skillMaxRating"
                @click="setListItem('languages', l.key, { points: (l.points ?? 0) + 1 })"
              >
                +
              </button>
            </div>
            <NxButton variant="text" class="remove" @click="removeListItem('languages', l.key)"
              >Remover {{ l.name }}</NxButton
            >
          </div>
        </li>
      </template>
    </ul>

    <form v-if="adding" class="add-form" @submit.prevent="addListItem">
      <label class="label" :for="`${uid}-name`">{{
        tab === 'knowledge' ? 'Conhecimento' : 'Idioma'
      }}</label>
      <input :id="`${uid}-name`" v-model="draftName" type="text" />
      <template v-if="tab === 'knowledge'">
        <label class="label" :for="`${uid}-cat`">Categoria</label>
        <select :id="`${uid}-cat`" v-model="draftCategory">
          <option v-for="cat in c.knowledgeCategories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </template>
      <label v-else class="check"
        ><input v-model="draftNative" type="checkbox" /> Idioma nativo</label
      >
      <NxButton type="submit">Adicionar</NxButton>
    </form>
    <button
      v-else
      type="button"
      class="sr-outline add"
      @click="
        tab === 'active'
          ? (picking = 'skill')
          : tab === 'groups'
            ? (picking = 'group')
            : startAdding()
      "
    >
      <span>{{
        {
          active: 'Adicionar perícia',
          groups: 'Adicionar grupo',
          knowledge: 'Adicionar conhecimento',
          languages: 'Adicionar idioma',
        }[tab]
      }}</span>
    </button>
  </section>

  <PickerSheet
    :open="!!picking"
    :title="picking === 'group' ? 'Grupo de perícias' : 'Perícia ativa'"
    :subtitle="`Restam ${left(picking === 'group' ? budgets?.skillGroups : budgets?.skills)} pontos`"
    :items="picking === 'group' ? groupItems : skillItems"
    @close="picking = undefined"
  >
    <template #action="{ item }">
      <NxButton @click="pick(item.id)">Adicionar com nível 1</NxButton>
    </template>
  </PickerSheet>
</template>

<style scoped>
.tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: calc(-1 * var(--space-3)) 0 var(--space-3);
  background: var(--sr-coal);
}

[role='tab'] {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: #a3a6ac;
  font: inherit;
  font-family: var(--font-numeric);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

[role='tab'][aria-selected='true'] {
  color: var(--sr-on-dark);
  box-shadow: inset 0 -3px 0 var(--sr-carmine-bright);
}

.tab-budget {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--sr-on-dark-muted);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hint {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-text-muted);
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
  gap: 1px;
}

.name {
  font-size: var(--text-md);
  font-weight: 600;
}

.detail,
.unit {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* Escolhido: caixa em caneta. Calculado: traço de 2px em cima, em impressão. */
.rating {
  width: 44px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font-size: 1.125rem;
  font-weight: 700;
}

.pool {
  width: 52px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: 3px;
  border-top: 2px solid var(--sr-print);
  color: var(--sr-print);
}

.pool .numeric {
  font-size: 1.125rem;
  font-weight: 700;
}

.editor,
.add-form {
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

.check {
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
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
}

.add > span {
  padding: 0 14px;
}
</style>
