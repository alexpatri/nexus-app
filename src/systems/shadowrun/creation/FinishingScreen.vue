<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { messageFor } from '@/core/api/messages'
import type { Violation } from '@/core/rules/system'
import NxButton from '@/core/ui/NxButton.vue'
import type { Derived } from '../rules'
import type { Sheet } from '../rules/validate'
import { nameOf, useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { screens, stepIds } from './steps'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
  // Strict de todos os passos: finalizar só com a lista vazia.
  all: Violation[]
  base: string
  finalize: () => Promise<void>
}>()

const c = useCatalogs()
const router = useRouter()
const sheet = computed(() => props.data as Sheet)
const identity = computed(() => sheet.value.identity ?? {})
const busy = ref(false)
const error = ref('')

const fields: { id: string; label: string; wide?: boolean }[] = [
  { id: 'name', label: 'Nome de rua' },
  { id: 'ethnicity', label: 'Etnia' },
  { id: 'age', label: 'Idade' },
  { id: 'sex', label: 'Sexo' },
  { id: 'height', label: 'Altura' },
  { id: 'weight', label: 'Peso' },
]

function setField(id: string, value: string) {
  props.edit((data) => {
    const idt = { ...((data.identity as Record<string, string> | undefined) ?? {}) }
    if (value.trim()) idt[id] = value
    else delete idt[id]
    data.identity = idt
  })
}

// O que ainda falta, por passo, com o caminho de volta.
const pending = computed(() => {
  const count = new Map<string, number>()
  for (const v of props.all) count.set(v.step, (count.get(v.step) ?? 0) + 1)
  return [...count]
    .sort(([a], [b]) => stepIds.indexOf(a) - stepIds.indexOf(b))
    .map(([step, n]) => {
      const screen = screens.find((s) => s.step === step)!
      return {
        step,
        n,
        title: screen.title,
        to: `${props.base}/${screen.id}`,
        number: stepIds.indexOf(step) + 1,
      }
    })
})

async function finish() {
  busy.value = true
  error.value = ''
  try {
    await props.finalize()
    await router.replace(props.base)
  } catch (err) {
    error.value = messageFor(err)
  } finally {
    busy.value = false
  }
}

useFooter({
  status: computed(() => 'A ficha continua editável depois de finalizada.'),
  alert: computed(() => error.value),
})
</script>

<template>
  <article class="sin" aria-label="Prévia do cartão SIN">
    <span class="kicker">SIN</span>
    <strong class="who">{{ identity.name?.trim() || 'Sem nome' }}</strong>
    <span class="what">
      {{ [nameOf(c.metatypes, sheet.metatype), identity.concept].filter(Boolean).join(' · ') }}
    </span>
  </article>

  <section class="side">
    <h2>Dados pessoais</h2>
    <div class="fields">
      <div v-for="f in fields" :key="f.id" class="field">
        <label class="label" :for="`identity-${f.id}`">
          {{ f.label }}<template v-if="f.id === 'name'"> (obrigatório)</template>
        </label>
        <input
          :id="`identity-${f.id}`"
          type="text"
          :value="identity[f.id] ?? ''"
          @change="setField(f.id, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div class="field">
      <label class="label" for="identity-notes">Anotações</label>
      <textarea
        id="identity-notes"
        rows="4"
        :value="identity.notes ?? ''"
        @change="setField('notes', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </section>

  <section class="side">
    <h2>Finalizar</h2>
    <ul v-if="pending.length" class="pending">
      <li v-for="p in pending" :key="p.step">
        <span
          >Passo {{ p.number }}, {{ p.title }}:
          {{ p.n === 1 ? '1 pendência' : `${p.n} pendências` }}</span
        >
        <RouterLink :to="p.to">Resolver</RouterLink>
      </li>
    </ul>
    <p v-else class="intro">Tudo de acordo com o livro. A ficha pode ser finalizada.</p>
    <NxButton :disabled="pending.length > 0 || busy" @click="finish">
      {{ busy ? 'Finalizando…' : 'Finalizar ficha' }}
    </NxButton>
  </section>
</template>

<style scoped>
.sin {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
}

.kicker {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

.who {
  font-size: 1.375rem;
  color: var(--sr-pen);
}

.what {
  font-size: var(--text-sm);
}

.side {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

h2 {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
}

.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.fields .field:first-child {
  grid-column: 1 / -1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

input,
textarea {
  min-height: var(--touch-min);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font: inherit;
  min-width: 0;
}

.intro {
  margin: 0;
  font-size: var(--text-sm);
}

.pending {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pending li {
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
  font-size: var(--text-sm);
  color: var(--color-danger);
}

.pending a {
  color: var(--sr-pen);
  font-weight: 600;
}
</style>
