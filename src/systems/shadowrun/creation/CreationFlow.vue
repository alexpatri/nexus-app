<script setup lang="ts">
import { IonContent, IonFooter, useIonRouter } from '@ionic/vue'
import { computed, ref } from 'vue'

import type { RulesSystem } from '@/core/rules/system'
import type { OpenSheet } from '@/core/sheets/open'
import NxBar from '@/core/ui/NxBar.vue'
import NxButton from '@/core/ui/NxButton.vue'
import ConceptStep from './ConceptStep.vue'
import type { Edit } from './edit'
import PendingStep from './PendingStep.vue'
import { stepIndex, steps } from './steps'

const props = defineProps<{ open: OpenSheet; rules: RulesSystem; step?: string }>()

const router = useIonRouter()

// Sem passo na rota, abre no primeiro que ainda falta, o mesmo do cartão.
const index = computed(() =>
  props.step ? stepIndex(props.step) : (props.open.sheet.summary.progress?.step ?? 1) - 1,
)
const current = computed(() => steps[index.value]!)
const next = computed(() => steps[index.value + 1])
const base = computed(() => `/fichas/${props.open.sheet.id}`)
const back = computed(() =>
  index.value === 0 ? '/' : `${base.value}/${steps[index.value - 1]!.id}`,
)

const rejected = ref(false)

const edit: Edit = (change) => {
  change(props.open.data)
  rejected.value = props.rules.validate(props.open.data, 'lenient').length > 0
  if (!rejected.value) props.open.changed()
}

const status = computed(() => {
  if (rejected.value) return 'Esta mudança não pôde ser salva.'
  switch (props.open.autosave.state.status) {
    case 'saved':
      return 'Rascunho salvo'
    case 'pending':
    case 'saving':
      return 'Salvando…'
    case 'offline':
      return 'Sem conexão. Tentando de novo…'
    case 'conflict':
      return 'A ficha mudou em outro aparelho.'
    default:
      return 'Não foi possível salvar.'
  }
})
const conflict = computed(() => props.open.autosave.state.status === 'conflict')

function segment(i: number) {
  return i < index.value ? 'done' : i === index.value ? 'current' : 'todo'
}

function advance() {
  if (next.value) router.push(`${base.value}/${next.value.id}`)
}

// A versão local é descartada: a do outro aparelho venceu.
function reload() {
  window.location.reload()
}
</script>

<template>
  <NxBar :back="back" :back-label="index === 0 ? 'Sair da criação' : 'Voltar'">
    <div class="heading">
      <h1>{{ current.title }}</h1>
      <span class="count">Passo {{ index + 1 }} de {{ steps.length }}</span>
    </div>
  </NxBar>

  <IonContent>
    <div class="segments" aria-hidden="true">
      <span v-for="(s, i) in steps" :key="s.id" :class="segment(i)" />
    </div>
    <main class="content">
      <ConceptStep v-if="current.id === 'concept'" :data="open.data" :edit="edit" />
      <PendingStep v-else />
    </main>
  </IonContent>

  <IonFooter class="ion-no-border">
    <div class="footer">
      <p class="status" role="status">{{ status }}</p>
      <NxButton v-if="conflict" variant="text" @click="reload">Recarregar</NxButton>
      <NxButton v-else-if="next" @click="advance">{{ next.action }}</NxButton>
    </div>
  </IonFooter>
</template>

<style scoped>
.heading {
  flex-grow: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding-right: var(--space-2);
}

.heading h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.count {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.segments {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 3px;
  padding: 0 var(--space-4);
}

.segments span {
  height: 4px;
  background: var(--color-rule);
}

.segments .done {
  background: var(--color-text);
}

.segments .current {
  background: var(--color-accent);
}

.content {
  padding: var(--space-5) var(--space-4);
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) var(--space-5);
  background: var(--color-surface-raised);
  border-top: var(--border-width) solid var(--color-rule);
}

.status {
  flex-grow: 1;
  margin: 0;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}
</style>
