<script setup lang="ts" generic="T extends PickerItem">
import { computed, nextTick, ref, useId, watch } from 'vue'

// Seletor (frontend-design-shadowrun.md): folha que sobe do rodapé, com busca.
// Item bloqueado continua na lista, com o motivo no lugar do detalhe: esconder
// deixaria o jogador sem saber por que não acha o item.
export interface PickerItem {
  id: string
  name: string
  // Detalhe em guilhochê; o motivo, quando bloqueado.
  note: string
  price: string
  blocked?: string
  description?: string
}

const props = defineProps<{ open: boolean; title: string; subtitle?: string; items: T[] }>()
const emit = defineEmits<{ close: [] }>()
defineSlots<{ action(props: { item: T }): unknown }>()

const id = useId()
const query = ref('')
const expanded = ref<string>()
const search = ref<HTMLInputElement>()
let opener: HTMLElement | null = null

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
const shown = computed(() => {
  const q = fold(query.value.trim())
  return props.items.filter((x) => fold(x.name).includes(q))
})

watch(
  () => props.open,
  async (open) => {
    if (open) {
      opener = document.activeElement as HTMLElement | null
      query.value = ''
      expanded.value = undefined
      await nextTick()
      search.value?.focus()
    } else {
      opener?.focus()
    }
  },
  { immediate: true },
)

function toggle(item: T) {
  if (!item.blocked) expanded.value = expanded.value === item.id ? undefined : item.id
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="scrim" @click.self="emit('close')" @keydown.esc="emit('close')">
      <section role="dialog" aria-modal="true" :aria-labelledby="`${id}-title`" class="sheet">
        <div class="grip" aria-hidden="true" />
        <header>
          <div class="heading">
            <h2 :id="`${id}-title`">{{ title }}</h2>
            <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
          </div>
          <button type="button" class="close" aria-label="Fechar" @click="emit('close')">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div class="search">
          <label :for="`${id}-search`">Buscar por nome</label>
          <input :id="`${id}-search`" ref="search" v-model="query" type="search" />
        </div>
        <ul>
          <li v-for="item in shown" :key="item.id">
            <button
              type="button"
              class="item"
              :disabled="!!item.blocked"
              :aria-expanded="expanded === item.id"
              @click="toggle(item)"
            >
              <span class="text">
                <span class="name">{{ item.name }}</span>
                <span class="note">{{ item.blocked ?? item.note }}</span>
              </span>
              <span class="price numeric">{{ item.price }}</span>
            </button>
            <div v-if="expanded === item.id" class="detail">
              <p v-if="item.description" class="description">{{ item.description }}</p>
              <slot name="action" :item="item" />
            </div>
          </li>
          <li v-if="shown.length === 0" class="empty">Nada com esse nome.</li>
        </ul>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: rgb(30 31 34 / 55%);
}

.sheet {
  position: absolute;
  inset: 72px 0 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-body);
  border-top: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
}

.grip {
  align-self: center;
  width: 40px;
  height: 4px;
  margin-top: var(--space-2);
  border-radius: 2px;
  background: var(--color-rule);
}

header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-2) 0 var(--space-4);
}

.heading {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.close {
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.search {
  padding: var(--space-3) var(--space-4) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

input {
  height: 48px;
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font: inherit;
  font-size: var(--text-md);
}

ul {
  flex-grow: 1;
  overflow-y: auto;
  margin: 0;
  padding: 0 var(--space-4) var(--space-4);
  list-style: none;
}

li {
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
}

.item {
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

.item:disabled {
  cursor: default;
}

.text {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.name {
  font-family: var(--font-numeric);
  font-size: 1.1875rem;
  font-weight: 600;
}

.item:disabled .name {
  font-weight: 500;
  color: var(--color-text-muted);
}

.note {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.price {
  flex-shrink: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}

.item:disabled .price {
  font-weight: 400;
  color: var(--color-text-muted);
}

.detail {
  padding: 0 0 14px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.description {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
}

.empty {
  padding: var(--space-4) 0;
  border: 0;
  color: var(--color-text-muted);
}
</style>
