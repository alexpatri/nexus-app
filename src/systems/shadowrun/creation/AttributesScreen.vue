<script setup lang="ts">
import { computed } from 'vue'

import type { Violation } from '@/core/rules/system'
import type { Derived } from '../rules'
import BudgetBoxes from '../ui/BudgetBoxes.vue'
import EdgeHexes from '../ui/EdgeHexes.vue'
import SrPanel from '../ui/SrPanel.vue'
import { pointsOf, setPoints } from './attributes'
import { useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
}>()

const c = useCatalogs()
const metatype = computed(() => c.metatypes.find((m) => m.id === props.data.metatype))
const budget = computed(() => props.derived?.budgets.attributes)
const special = computed(() => props.derived?.budgets.special)
const nameOf = (id: string) => c.attributes.find((a) => a.id === id)?.name ?? id

// Atributos com violação no passo: borda carmim no valor.
const flagged = computed(() => {
  const ids = new Set<string>()
  for (const v of props.violations) {
    if (v.code === 'attributes.tooManyAtMax') {
      for (const a of (v.params?.attributes ?? []) as string[]) ids.add(a)
    }
    if (v.code === 'attributes.aboveMax') ids.add(v.params?.attribute as string)
  }
  return ids
})

function row(id: string) {
  const range = metatype.value?.attributes[id]
  const value = props.derived?.attributes?.[id]?.natural ?? range?.min ?? 0
  const max = range?.max ?? 0
  const karma = (props.data.attributes as Record<string, { karma?: number }> | undefined)?.[id]
    ?.karma
  return {
    id,
    name: nameOf(id),
    value,
    points: pointsOf(props.data, id),
    atMax: value >= max,
    hint:
      (value >= max ? `Máximo natural ${max}` : `De ${range?.min} a ${max}`) +
      (karma ? `; ${karma} de carma` : ''),
  }
}

const groups = computed(() =>
  [
    { title: 'Físicos', category: 'physical' },
    { title: 'Mentais', category: 'mental' },
  ].map((g) => ({
    title: g.title,
    physical: g.category === 'physical',
    rows: c.attributes.filter((a) => a.category === g.category).map((a) => row(a.id)),
  })),
)
const edge = computed(() => row('edg'))
const edgeMax = computed(() => metatype.value?.attributes.edg?.max ?? 6)

function bump(id: string, delta: number) {
  props.edit((data) => setPoints(data, id, pointsOf(data, id) + delta))
}

useFooter({
  status: computed(() => {
    if (!metatype.value) return 'Falta o metatipo.'
    if (!budget.value) return 'Falta a prioridade de Atributos.'
    const left = budget.value.total - budget.value.spent
    if (left > 0)
      return `Sobram ${left} ${left === 1 ? 'ponto' : 'pontos'}. Você pode voltar depois.`
    if (left === 0) return 'Todos os pontos distribuídos.'
    return `Tire ${-left} para caber no orçamento.`
  }),
  alert: computed(() => {
    for (const v of props.violations) {
      if (v.code === 'attributes.tooManyAtMax') {
        const names = ((v.params?.attributes ?? []) as string[]).map(nameOf)
        return `Só um atributo pode começar no máximo natural: ${names.slice(0, -1).join(', ')} e ${names.at(-1)} estão no máximo.`
      }
      if (v.code === 'attributes.aboveMax') {
        return `${nameOf(v.params?.attribute as string)} ${v.params?.value} passa do máximo natural ${v.params?.max}.`
      }
    }
    return ''
  }),
  blocked: computed(() => !metatype.value),
})
</script>

<template>
  <p v-if="!metatype" class="intro">
    As faixas dos atributos vêm do metatipo. Volte e escolha um antes de distribuir os pontos.
  </p>
  <template v-else>
    <div class="sticky">
      <BudgetBoxes
        v-if="budget"
        label="Pontos de atributo"
        :total="budget.total"
        :spent="budget.spent"
      />
      <p v-else class="intro">Escolha a prioridade de Atributos para ter pontos a distribuir.</p>
    </div>

    <SrPanel v-for="g in groups" :key="g.title" :title="g.title" class="group">
      <div v-for="r in g.rows" :key="r.id" class="row">
        <div class="label">
          <span :class="['name', { physical: g.physical }]">{{ r.name }}</span>
          <span class="hint">{{ r.hint }}</span>
        </div>
        <button
          type="button"
          class="sr-outline step"
          :aria-label="`Baixar ${r.name}`"
          :disabled="r.points === 0"
          @click="bump(r.id, -1)"
        >
          <span>−</span>
        </button>
        <output
          :class="['value', 'numeric', { flagged: flagged.has(r.id) }]"
          :aria-label="`${r.name} ${r.value}`"
          aria-live="polite"
        >
          {{ r.value }}
        </output>
        <button
          type="button"
          class="sr-outline step"
          :aria-label="`Subir ${r.name}`"
          :disabled="r.atMax"
          @click="bump(r.id, 1)"
        >
          <span>+</span>
        </button>
      </div>
    </SrPanel>

    <SrPanel title="Especiais" class="group">
      <BudgetBoxes
        v-if="special && special.total > 0"
        class="special-budget"
        label="Pontos especiais"
        :total="special.total"
        :spent="special.spent"
      />
      <div class="row">
        <div class="label">
          <span class="name">{{ edge.name }}</span>
          <EdgeHexes :value="edge.value" :max="edgeMax" :label="edge.name" />
          <span class="hint">
            {{
              special && special.total > 0
                ? edge.hint
                : 'Sem pontos especiais; sobe com carma no passo 7'
            }}
          </span>
        </div>
        <template v-if="special && special.total > 0">
          <button
            type="button"
            class="sr-outline step"
            :aria-label="`Baixar ${edge.name}`"
            :disabled="edge.points === 0"
            @click="bump('edg', -1)"
          >
            <span>−</span>
          </button>
          <output
            :class="['value', 'numeric', { flagged: flagged.has('edg') }]"
            :aria-label="`${edge.name} ${edge.value}`"
            aria-live="polite"
          >
            {{ edge.value }}
          </output>
          <button
            type="button"
            class="sr-outline step"
            :aria-label="`Subir ${edge.name}`"
            :disabled="edge.atMax"
            @click="bump('edg', 1)"
          >
            <span>+</span>
          </button>
        </template>
        <output v-else class="value numeric" :aria-label="`${edge.name} ${edge.value}`">
          {{ edge.value }}
        </output>
      </div>
    </SrPanel>
  </template>
</template>

<style scoped>
.intro {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  line-height: 1.5;
  max-width: 34em;
}

/* O orçamento fica parado; a lista rola por baixo. */
.sticky {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-4)) var(--space-4);
  padding: 14px var(--space-4) var(--space-3);
  background: var(--color-surface);
  border-bottom: var(--border-width) solid var(--color-rule);
}

.group {
  margin-bottom: var(--space-5);
}

.special-budget {
  margin: var(--space-3) 0 var(--space-1);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 58px;
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
}

.row:last-child {
  border-bottom: 0;
}

.label {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-family: var(--font-numeric);
  font-size: 1.1875rem;
  font-weight: 600;
}

/* Atributos físicos em carmim, como na ficha do livro. */
.name.physical {
  color: var(--sr-carmine);
}

.hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.step {
  width: var(--touch-min);
  height: var(--touch-min);
  flex-shrink: 0;
  font-size: 1.375rem;
  line-height: 1;
}

.value {
  width: 36px;
  text-align: center;
  color: var(--sr-pen);
  font-size: 1.625rem;
  font-weight: 700;
}

/* Violação: o número em vermelho de alerta com sublinhado grosso. */
.value.flagged {
  color: var(--color-danger);
  text-decoration: underline 3px;
  text-underline-offset: 4px;
}
</style>
