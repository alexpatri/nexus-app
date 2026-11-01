<script setup lang="ts">
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { ref } from 'vue'

import { createCharacter } from '@/core/api/characters'
import { messageFor } from '@/core/api/messages'
import { adopt } from '@/core/sheets/open'
import NxBar from '@/core/ui/NxBar.vue'
import { enterWorld } from '@/core/ui/world'
import { applyTheme } from '@/design/apply'
import { modules, type SystemModule } from '@/systems'
import BrandBand from './BrandBand.vue'

const router = useIonRouter()
const busy = ref('')
const error = ref('')

async function start(module: SystemModule, event: MouseEvent) {
  if (busy.value) return
  busy.value = module.id
  error.value = ''
  const card = (event.currentTarget as HTMLElement).getBoundingClientRect()
  try {
    const [{ sheet }, world] = await Promise.all([
      createCharacter(module.id, module.version),
      module.load(),
    ])
    adopt(sheet)
    await enterWorld(card, world.theme.color.surface)
    applyTheme(world.theme, module.id)
    router.push(`/fichas/${sheet.id}`)
  } catch (err) {
    error.value = messageFor(err)
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <IonPage>
    <NxBar back="/">
      <span class="bar-title">Novo personagem</span>
    </NxBar>

    <IonContent>
      <main class="content">
        <div class="intro">
          <h1>Escolha o sistema</h1>
          <p>O sistema define as regras da ficha. Ele não muda depois.</p>
        </div>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <button
          v-for="m in modules"
          :key="m.id + m.version"
          type="button"
          class="system"
          :aria-busy="busy === m.id"
          @click="start(m, $event)"
        >
          <BrandBand :system="m.id" :version="m.version" />
          <span class="body">
            <span class="text">
              <span class="name">{{ m.brand.name }}</span>
              <span class="description">{{ m.description }}</span>
            </span>
            <svg
              width="22"
              height="22"
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
          </span>
        </button>
      </main>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.bar-title {
  font-size: var(--text-lg);
  font-weight: 600;
}

.content {
  padding: var(--space-2) var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

h1 {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.intro p {
  margin: 0;
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--color-text-muted);
}

.error {
  margin: 0;
  font-weight: 600;
  color: var(--color-danger);
}

.system {
  display: block;
  padding: 0;
  border: var(--border-width) solid var(--color-rule);
  border-radius: var(--nx-radius-card);
  background: var(--color-surface-raised);
  overflow: hidden;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.system[aria-busy='true'] {
  cursor: progress;
}

.body {
  padding: 14px var(--space-4) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-muted);
}

.text {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.name {
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.description {
  font-size: var(--text-sm);
  line-height: 1.45;
}
</style>
