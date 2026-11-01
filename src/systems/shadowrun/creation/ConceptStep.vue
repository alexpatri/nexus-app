<script setup lang="ts">
import { computed } from 'vue'

import NxField from '@/core/ui/NxField.vue'

import type { Edit } from './edit'

const props = defineProps<{ data: Record<string, unknown>; edit: Edit }>()

// Papéis comuns numa equipe de incursores, como ponto de partida.
const suggestions = [
  'Samurai urbano',
  'Decker',
  'Face',
  'Mago de combate',
  'Adepto',
  'Rigger',
  'Tecnomante',
  'Infiltrador',
]

const concept = computed({
  get: () => (props.data.identity as Record<string, string> | undefined)?.concept ?? '',
  set: (value: string) =>
    props.edit((data) => {
      const identity = { ...(data.identity as Record<string, string> | undefined) }
      if (value) identity.concept = value
      else delete identity.concept
      data.identity = identity
    }),
})
</script>

<template>
  <div class="step">
    <NxField
      v-model="concept"
      label="Conceito"
      hint="Em poucas palavras: quem é o incursor e o que ele faz pela equipe."
    />
    <div class="suggestions">
      <p id="concept-suggestions" class="label">Sugestões</p>
      <ul aria-labelledby="concept-suggestions">
        <li v-for="s in suggestions" :key="s">
          <button type="button" :aria-pressed="concept === s" @click="concept = s">{{ s }}</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.label {
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

button {
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
}

button[aria-pressed='true'] {
  border-color: var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}
</style>
