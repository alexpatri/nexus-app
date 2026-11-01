<script setup lang="ts">
import { computed } from 'vue'

import { useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'

const props = defineProps<{ data: Record<string, unknown>; edit: Edit }>()

const c = useCatalogs()
const letter = computed(
  () => (props.data.priorities as Record<string, string> | undefined)?.metatype,
)
const row = computed(() => c.rows.find((r) => r.priority === letter.value))
const picked = computed(() => props.data.metatype as string | undefined)

const options = computed(() =>
  (row.value?.metatype ?? []).map((opt) => {
    const m = c.metatypes.find((x) => x.id === opt.metatype)!
    const traits = m.traits.map((t) => t.name)
    return {
      id: m.id,
      name: m.name,
      special: opt.specialPoints,
      traits: traits.length > 0 ? `${traits.join(', ')}.` : 'Sem traços.',
      ranges: ['bod', 'agi', 'rea', 'str', 'wil', 'log', 'int', 'cha', 'edg'].map((a) => ({
        abbr: c.attributes.find((x) => x.id === a)?.abbr ?? a,
        range: `${m.attributes[a]?.min}–${m.attributes[a]?.max}`,
      })),
    }
  }),
)
const current = computed(() => options.value.find((o) => o.id === picked.value))
const outside = computed(() => !!picked.value && !!row.value && !current.value)

function pick(id: string) {
  props.edit((data) => {
    data.metatype = id
  })
}

const points = (n: number) => (n === 1 ? 'ponto especial' : 'pontos especiais')

useFooter({
  status: computed(() => {
    const m = current.value
    if (!row.value) return 'Falta a prioridade de Metatipo.'
    if (!m) return 'Escolha um metatipo.'
    return m.special === 0
      ? `${m.name} sem pontos especiais. Trunfo só com carma.`
      : `${m.name} com ${m.special} ${points(m.special)}.`
  }),
  alert: computed(() => {
    if (!outside.value) return ''
    const name = c.metatypes.find((m) => m.id === picked.value)?.name ?? picked.value
    return `${name} não está na prioridade ${letter.value}. Escolha outro metatipo ou mude a letra.`
  }),
  blocked: computed(() => !current.value),
})
</script>

<template>
  <p v-if="!row" class="intro">
    O metatipo depende da letra da coluna Metatipo. Volte às prioridades e escolha uma.
  </p>
  <template v-else>
    <p class="intro">
      Metatipo na prioridade {{ letter }}. Os pontos especiais compram Trunfo e, se o personagem for
      desperto, Magia ou Ressonância.
    </p>
    <div role="radiogroup" aria-label="Metatipo" class="list">
      <div v-for="m in options" :key="m.id" :class="['option', { on: m.id === picked }]">
        <button type="button" role="radio" :aria-checked="m.id === picked" @click="pick(m.id)">
          <span class="ring" aria-hidden="true"><span /></span>
          <span class="text">
            <span class="name">{{ m.name }}</span>
            <span class="traits">{{ m.traits }}</span>
          </span>
          <span class="special">
            <span class="numeric">{{ m.special }}</span>
            <span class="special-label">{{ points(m.special) }}</span>
          </span>
        </button>
        <div v-if="m.id === picked" class="ranges">
          <span class="ranges-label">Faixa natural dos atributos</span>
          <dl>
            <div v-for="r in m.ranges" :key="r.abbr">
              <dt>{{ r.abbr }}</dt>
              <dd class="numeric">{{ r.range }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.intro {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  line-height: 1.5;
  max-width: 34em;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.option {
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  margin: 1px;
}

.option.on {
  border: 2px solid var(--sr-pen);
  margin: 0;
}

button {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-3);
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
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

.on .ring {
  border-color: var(--sr-pen);
}

.on .ring span {
  background: var(--sr-pen);
}

.text {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 1.0625rem;
  font-weight: 700;
}

.on .name {
  color: var(--sr-pen);
}

.traits {
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.special {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  text-align: right;
}

.special .numeric {
  font-size: 1.25rem;
  font-weight: 700;
}

.special-label,
.ranges-label,
dt {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.ranges {
  padding: var(--space-1) var(--space-3) 14px 48px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

dl {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px 10px;
}

dd {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}
</style>
