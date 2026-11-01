<script setup lang="ts">
import { computed } from 'vue'

import { useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { assign, describe, letters, type Priorities } from './priorities'

const props = defineProps<{ data: Record<string, unknown>; edit: Edit }>()

const c = useCatalogs()
const chosen = computed(() => (props.data.priorities ?? {}) as Priorities)
const nameOf = (column: string) => c.columns.find((x) => x.id === column)?.name ?? column

function pick(column: string, letter: string) {
  props.edit((data) => {
    const next = assign(chosen.value, column, letter)
    if (Object.keys(next).length > 0) data.priorities = next
    else delete data.priorities
  })
}

function state(column: string, letter: string) {
  if (chosen.value[column] === letter) return 'picked'
  return Object.values(chosen.value).includes(letter) ? 'used' : 'free'
}

function label(column: string, letter: string) {
  const holder = Object.keys(chosen.value).find((k) => chosen.value[k] === letter)
  if (holder === column) return `${letter}, escolhida`
  if (holder) return `${letter}, usada em ${nameOf(holder)}; tocar troca`
  return `${letter}, livre`
}

const missing = computed(() =>
  c.columns.filter((col) => !chosen.value[col.id]).map((col) => col.name),
)

useFooter({
  status: computed(() => {
    const m = missing.value
    if (m.length === 0) return 'Todas as colunas têm prioridade.'
    return `Falta ${m.length === 1 ? m[0] : `${m.slice(0, -1).join(', ')} e ${m.at(-1)}`}.`
  }),
  blocked: computed(() => missing.value.length > 0),
})
</script>

<template>
  <p class="intro">
    Distribua as letras de A a E entre as cinco colunas. Cada letra vale para uma coluna só; tocar
    numa letra já usada troca as duas de lugar.
  </p>
  <section v-for="col in c.columns" :key="col.id" class="column">
    <h2 :id="`priority-${col.id}`">{{ col.name }}</h2>
    <div role="radiogroup" :aria-labelledby="`priority-${col.id}`" class="letters">
      <button
        v-for="l in letters"
        :key="l"
        type="button"
        role="radio"
        :aria-checked="chosen[col.id] === l"
        :aria-label="label(col.id, l)"
        :class="['letter', state(col.id, l)]"
        @click="pick(col.id, l)"
      >
        {{ l }}
      </button>
    </div>
    <p :class="['gives', { empty: !chosen[col.id] }]">
      {{ chosen[col.id] ? describe(c, col.id, chosen[col.id]!) : 'Ainda sem prioridade.' }}
    </p>
  </section>
</template>

<style scoped>
.intro {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  line-height: 1.5;
  max-width: 34em;
}

.column {
  padding: 14px 0 var(--space-4);
  border-top: var(--border-width) solid var(--color-rule);
}

h2 {
  margin: 0 0 10px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.letters {
  display: flex;
  gap: var(--space-2);
}

.letter {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font: inherit;
  font-size: var(--text-lg);
  cursor: pointer;
}

.free {
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
}

/* Círculo de caneta, levemente irregular e inclinado. */
.picked {
  font-weight: 800;
  color: var(--sr-pen);
  background: transparent;
  border: 2px solid var(--sr-pen);
  border-radius: 52% 48% 50% 50% / 46% 54% 48% 52%;
  transform: rotate(-5deg);
}

.used {
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: var(--border-width) solid transparent;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.gives {
  margin: 10px 0 0;
  font-size: var(--text-sm);
  line-height: 1.45;
}

.gives.empty {
  color: var(--color-text-muted);
}
</style>
