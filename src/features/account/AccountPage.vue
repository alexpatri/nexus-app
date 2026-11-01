<script setup lang="ts">
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { ref, watch } from 'vue'

import { logout, logoutAll, updateName } from '@/core/api/core'
import { messageFor } from '@/core/api/messages'
import { session } from '@/core/session/session'
import { setTextSize, textSize, textSizes, type TextSize } from '@/core/settings/textSize'
import ConfirmSheet from '@/core/ui/ConfirmSheet.vue'
import NxBar from '@/core/ui/NxBar.vue'
import NxButton from '@/core/ui/NxButton.vue'
import NxField from '@/core/ui/NxField.vue'
import { firstError, nameSchema } from '@/core/validation/auth'

const router = useIonRouter()

const name = ref(session.state.user?.name ?? '')
const nameStatus = ref('')
watch(
  () => session.state.user?.name,
  (n) => {
    if (n !== undefined) name.value = n
  },
)

async function saveName() {
  const parsed = nameSchema.safeParse(name.value)
  if (!parsed.success) {
    nameStatus.value = firstError(parsed)
    return
  }
  const trimmed = parsed.data
  if (trimmed === session.state.user?.name) return
  try {
    await updateName(trimmed)
    nameStatus.value = 'Nome salvo.'
  } catch (err) {
    nameStatus.value = messageFor(err)
  }
}

const sizeButtons = ref<HTMLButtonElement[]>([])

// Grupo de rádio: as setas trocam a escolha, como num rádio nativo.
function moveSize(e: KeyboardEvent, index: number) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
  if (!step) return
  e.preventDefault()
  const next = (index + step + textSizes.length) % textSizes.length
  setTextSize(textSizes[next]!.id as TextSize)
  sizeButtons.value[next]?.focus()
}

async function signOut() {
  await logout()
  router.replace('/entrar')
}

const confirmingAll = ref(false)
const allError = ref('')
const allBusy = ref(false)

async function signOutEverywhere() {
  allBusy.value = true
  allError.value = ''
  try {
    await logoutAll()
    confirmingAll.value = false
    router.replace('/entrar')
  } catch (err) {
    allError.value = messageFor(err)
  } finally {
    allBusy.value = false
  }
}
</script>

<template>
  <IonPage>
    <NxBar back="/">
      <h1>Conta</h1>
    </NxBar>

    <IonContent>
      <main class="content">
        <section aria-labelledby="h-perfil" class="group">
          <h2 id="h-perfil">Perfil</h2>
          <form @submit.prevent="saveName">
            <NxField v-model="name" label="Nome" autocomplete="name" @focusout="saveName" />
          </form>
          <p v-if="nameStatus" class="status" role="status">{{ nameStatus }}</p>
          <div class="readonly">
            <span class="label">E-mail</span>
            <span>{{ session.state.user?.email }}</span>
          </div>
        </section>

        <section aria-labelledby="h-texto" class="group">
          <h2 id="h-texto">Tamanho do texto</h2>
          <div role="radiogroup" aria-labelledby="h-texto" class="segmented">
            <button
              v-for="(size, i) in textSizes"
              :key="size.id"
              ref="sizeButtons"
              type="button"
              role="radio"
              :aria-checked="textSize === size.id"
              :tabindex="textSize === size.id ? 0 : -1"
              @click="setTextSize(size.id)"
              @keydown="moveSize($event, i)"
            >
              {{ size.label }}
            </button>
          </div>
          <p class="sample">Vale para o Nexus e para as fichas de todos os sistemas.</p>
        </section>

        <section aria-labelledby="h-acesso" class="access">
          <h2 id="h-acesso">Acesso</h2>
          <RouterLink to="/conta/senha" class="row">
            Trocar senha
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </RouterLink>
          <button type="button" class="row" @click="signOut">Sair</button>
          <button type="button" class="row danger" @click="confirmingAll = true">
            Sair de todos os aparelhos
            <span>Inclusive este. Use se perdeu um aparelho.</span>
          </button>
        </section>
      </main>

      <ConfirmSheet v-model:open="confirmingAll" title="Sair de todos os aparelhos?">
        <p>Todas as sessões da sua conta terminam, inclusive esta. Depois é só entrar de novo.</p>
        <p v-if="allError" role="alert" class="error">{{ allError }}</p>
        <NxButton variant="danger" :busy="allBusy" @click="signOutEverywhere"
          >Sair de todos</NxButton
        >
        <NxButton variant="text" @click="confirmingAll = false">Cancelar</NxButton>
      </ConfirmSheet>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.content {
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: var(--space-2) var(--space-4) var(--space-5);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

h2 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-muted);
}

.status {
  margin: -6px 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.readonly {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 1.0625rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  overflow: hidden;
}

.segmented button {
  min-height: 48px;
  border: 0;
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-md);
  font-weight: 500;
  cursor: pointer;
}

.segmented button + button {
  border-left: var(--border-width) solid var(--color-border);
}

.segmented button[aria-checked='true'] {
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 700;
}

.segmented button:focus-visible {
  outline-offset: -4px;
  outline-color: var(--color-on-accent);
}

.segmented button[aria-checked='false']:focus-visible {
  outline-color: var(--color-focus);
}

.sample {
  margin: 0;
  font-size: var(--text-md);
  line-height: 1.5;
}

.access {
  display: flex;
  flex-direction: column;
}

.access h2 {
  margin-bottom: var(--space-1);
}

.row {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  border: 0;
  border-bottom: var(--border-width) solid var(--color-rule);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 1.0625rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.row svg {
  color: var(--color-text-muted);
}

.row.danger {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: var(--space-2) 0;
  border-bottom: 0;
  color: var(--color-danger);
}

.row.danger span {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger) !important;
  font-weight: 600;
}
</style>
