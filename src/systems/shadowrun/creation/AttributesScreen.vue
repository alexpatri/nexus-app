<script setup lang="ts">
import { computed } from 'vue'

import type { Violation } from '@/core/rules/system'
import type { Derived } from '../rules'
import BudgetBoxes from '../ui/BudgetBoxes.vue'
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
    rows: c.attributes.filter((a) => a.category === g.category).map((a) => row(a.id)),
  })),
)
const edge = computed(() => row('edg'))

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

    <section v-for="g in groups" :key="g.title" class="group">
      <h2>{{ g.title }}</h2>
      <div v-for="r in g.rows" :key="r.id" class="row">
        <div class="label">
          <span class="name">{{ r.name }}</span>
          <span class="hint numeric">{{ r.hint }}</span>
        </div>
        <button
          type="button"
          class="step"
          :aria-label="`Baixar ${r.name}`"
          :disabled="r.points === 0"
          @click="bump(r.id, -1)"
        >
          −
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
          class="step"
          :aria-label="`Subir ${r.name}`"
          :disabled="r.atMax"
          @click="bump(r.id, 1)"
        >
          +
        </button>
      </div>
    </section>

    <section class="group">
      <h2>Especial</h2>
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
            class="step"
            :aria-label="`Baixar ${edge.name}`"
            :disabled="edge.points === 0"
            @click="bump('edg', -1)"
          >
            −
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
            class="step"
            :aria-label="`Subir ${edge.name}`"
            :disabled="edge.atMax"
            @click="bump('edg', 1)"
          >
            +
          </button>
        </template>
        <output v-else class="value numeric" :aria-label="`${edge.name} ${edge.value}`">
          {{ edge.value }}
        </output>
      </div>
    </section>
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
  margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-4)) 0;
  padding: 14px var(--space-4) var(--space-3);
  background: var(--color-surface);
  border-bottom: var(--border-width) solid var(--color-rule);
}

.group {
  padding-top: 14px;
}

h2 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.special-budget {
  margin: var(--space-2) 0;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 56px;
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
}

.label {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: var(--text-md);
  font-weight: 600;
}

.hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.step {
  width: var(--touch-min);
  height: var(--touch-min);
  flex-shrink: 0;
  padding: 0;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: 1.375rem;
  line-height: 1;
  cursor: pointer;
}

.step:disabled {
  border-color: var(--color-surface-sunken);
  background: transparent;
  color: var(--color-rule);
  cursor: not-allowed;
}

.value {
  width: 48px;
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font-size: 1.25rem;
  font-weight: 700;
}

.value.flagged {
  border: 2px solid var(--color-danger);
}
</style>
