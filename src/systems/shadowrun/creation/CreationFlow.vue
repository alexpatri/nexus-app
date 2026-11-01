<script setup lang="ts">
import { IonContent, IonFooter, useIonRouter } from '@ionic/vue'
import { computed, ref } from 'vue'

import type { RulesSystem } from '@/core/rules/system'
import type { OpenSheet } from '@/core/sheets/open'
import NxBar from '@/core/ui/NxBar.vue'
import NxButton from '@/core/ui/NxButton.vue'
import type { Derived } from '../rules'
import AttributesScreen from './AttributesScreen.vue'
import ConceptStep from './ConceptStep.vue'
import type { Edit } from './edit'
import { provideFooter } from './footer'
import MetatypeScreen from './MetatypeScreen.vue'
import PendingStep from './PendingStep.vue'
import PrioritiesScreen from './PrioritiesScreen.vue'
import { screenIndex, screens, stepIds, stepNumber } from './steps'

const props = defineProps<{ open: OpenSheet; rules: RulesSystem; step?: string }>()

const router = useIonRouter()
const footer = provideFooter()

const index = computed(() => screenIndex(props.step, props.open.sheet.summary.progress?.step))
const current = computed(() => screens[index.value]!)
const next = computed(() => screens[index.value + 1])
const number = computed(() => stepNumber(current.value))
const base = computed(() => `/fichas/${props.open.sheet.id}`)
const back = computed(() =>
  index.value === 0 ? '/' : `${base.value}/${screens[index.value - 1]!.id}`,
)

// O que a ficha calcula agora, sem esperar o servidor.
const derived = computed(() => {
  try {
    return props.rules.derive(props.open.data) as Derived
  } catch {
    return undefined
  }
})
const violations = computed(() =>
  props.rules.validate(props.open.data, 'strict').filter((v) => v.step === current.value.step),
)

const rejected = ref(false)

// Mudança que o Lenient recusa é desfeita: a tela nunca mostra o que não seria salvo.
const edit: Edit = (change) => {
  const before = JSON.stringify(props.open.data)
  change(props.open.data)
  rejected.value = props.rules.validate(props.open.data, 'lenient').length > 0
  if (rejected.value) props.open.restore(JSON.parse(before))
  else props.open.changed()
}

const saveStatus = computed(() => {
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
const saveProblem = computed(
  () =>
    rejected.value || !['saved', 'pending', 'saving'].includes(props.open.autosave.state.status),
)
const status = computed(() => {
  if (rejected.value) return 'Esta mudança não pôde ser salva.'
  if (saveProblem.value) return saveStatus.value
  return footer.value.status?.value || saveStatus.value
})
const alert = computed(() => footer.value.alert?.value ?? '')
const blocked = computed(() => footer.value.blocked?.value ?? false)
const conflict = computed(() => props.open.autosave.state.status === 'conflict')

function segment(i: number) {
  return i + 1 < number.value ? 'done' : i + 1 === number.value ? 'current' : 'todo'
}

function advance() {
  if (next.value && !blocked.value) router.push(`${base.value}/${next.value.id}`)
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
      <span class="count numeric">Passo {{ number }} de {{ stepIds.length }}</span>
    </div>
  </NxBar>

  <IonContent>
    <div class="segments" aria-hidden="true">
      <span v-for="(s, i) in stepIds" :key="s" :class="segment(i)" />
    </div>
    <main class="content">
      <ConceptStep v-if="current.id === 'concept'" :data="open.data" :edit="edit" />
      <PrioritiesScreen v-else-if="current.id === 'priorities'" :data="open.data" :edit="edit" />
      <MetatypeScreen v-else-if="current.id === 'metatype'" :data="open.data" :edit="edit" />
      <AttributesScreen
        v-else-if="current.id === 'attributes'"
        :data="open.data"
        :edit="edit"
        :derived="derived"
        :violations="violations"
      />
      <PendingStep v-else />
    </main>
  </IonContent>

  <IonFooter class="ion-no-border">
    <div class="footer">
      <p v-if="alert" role="alert" class="alert">{{ alert }}</p>
      <div class="bar">
        <p class="status" role="status">{{ status }}</p>
        <NxButton v-if="conflict" variant="text" @click="reload">Recarregar</NxButton>
        <NxButton v-else-if="next" :disabled="blocked" @click="advance">{{ next.action }}</NxButton>
      </div>
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
  background: var(--sr-print);
}

.segments .current {
  background: var(--sr-pen);
}

.content {
  padding: var(--space-5) var(--space-4);
}

.footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--space-3) var(--space-4) var(--space-5);
  background: var(--color-surface-raised);
  border-top: var(--border-width) solid var(--color-rule);
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.alert {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  font-weight: 600;
  color: var(--color-danger);
}

.status {
  flex-grow: 1;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}
</style>
