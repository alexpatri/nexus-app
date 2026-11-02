<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import type { CharacterListItem } from '@/core/api/characters'
import { enterWorld } from '@/core/ui/world'
import { moduleFor, splashOf } from '@/systems'
import BrandBand from './BrandBand.vue'

const props = defineProps<{ character: CharacterListItem }>()

const brand = computed(
  () => moduleFor(props.character.system, props.character.systemVersion)?.brand,
)
const summary = computed(() => props.character.sheet.summary)
const name = computed(() => summary.value.title || props.character.name || 'Sem nome')
const draft = computed(() => props.character.sheet.status === 'draft')
const progress = computed(() => (draft.value ? summary.value.progress : undefined))
const status = computed(() =>
  progress.value ? `Rascunho, passo ${progress.value.step} de ${progress.value.total}` : 'Rascunho',
)

const systemName = computed(() => brand.value?.name ?? props.character.system)

const label = computed(() => {
  const state = draft.value
    ? `rascunho de ${systemName.value}` +
      (progress.value ? ` no passo ${progress.value.step} de ${progress.value.total}` : '')
    : `ficha pronta de ${systemName.value}`
  return `${name.value}, ${state}`
})

const router = useRouter()
const to = computed(() => `/fichas/${props.character.sheet.id}`)

// Toque simples abre o mundo do sistema a partir do cartão e só então navega;
// com modificador, o link segue o comportamento do navegador.
async function open(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  if (brand.value) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    await enterWorld(rect, splashOf(brand.value), props.character.id)
  }
  await router.push(to.value)
}

function segment(i: number) {
  const step = progress.value?.step ?? 0
  return i < step ? 'done' : i === step ? 'current' : 'todo'
}
</script>

<template>
  <RouterLink v-slot="{ href }" :to="to" custom>
    <a :href="href" class="card" :aria-label="label" :data-character="character.id" @click="open">
      <BrandBand :system="character.system" :version="character.systemVersion" />
      <div class="body">
        <h2 class="name">{{ name }}</h2>
        <p class="subtitle">{{ summary.subtitle }}</p>
        <div v-if="draft" class="draft">
          <p class="status">{{ status }}</p>
          <div v-if="progress" class="segments" aria-hidden="true">
            <span v-for="i in progress.total" :key="i" :class="segment(i)" />
          </div>
        </div>
        <dl v-else-if="summary.highlights?.length" class="highlights">
          <div v-for="h in summary.highlights" :key="h.label">
            <dt>{{ h.label }}</dt>
            <dd class="numeric">{{ h.value }}</dd>
          </div>
        </dl>
      </div>
    </a>
  </RouterLink>
</template>

<style scoped>
.card {
  display: block;
  color: inherit;
  text-decoration: none;
  border: var(--border-width) solid var(--color-rule);
  border-radius: var(--nx-radius-card);
  background: var(--color-surface-raised);
  overflow: hidden;
}

.body {
  padding: 14px var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.name {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.draft {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}

.segments {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 3px;
}

.segments span {
  height: 4px;
  border-radius: 2px;
  background: var(--color-rule);
}

.segments .done {
  background: var(--color-text);
}

.segments .current {
  background: var(--color-text-muted);
}

.highlights {
  margin: 10px 0 0;
  display: flex;
  gap: var(--space-5);
}

.highlights dt {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.highlights dd {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}
</style>
