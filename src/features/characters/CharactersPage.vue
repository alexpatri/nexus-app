<script setup lang="ts">
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue'
import { computed, ref } from 'vue'

import { type CharacterListItem, listCharacters } from '@/core/api/characters'
import { messageFor } from '@/core/api/messages'
import { session } from '@/core/session/session'
import NxBar from '@/core/ui/NxBar.vue'
import NexusMark from '@/design/NexusMark.vue'
import CharacterCard from './CharacterCard.vue'
import { sortForList } from './order'

const characters = ref<CharacterListItem[]>()
const error = ref('')

const initial = computed(() => session.state.user?.name.trim().charAt(0).toUpperCase() || '?')

onIonViewWillEnter(async () => {
  try {
    characters.value = sortForList(await listCharacters())
    error.value = ''
  } catch (err) {
    error.value = messageFor(err)
  }
})
</script>

<template>
  <IonPage>
    <NxBar>
      <NexusMark class="mark" />
      <span class="brand">Nexus</span>
      <RouterLink
        to="/conta"
        class="account"
        :aria-label="`Conta de ${session.state.user?.name ?? ''}`"
      >
        <span aria-hidden="true">{{ initial }}</span>
      </RouterLink>
    </NxBar>

    <IonContent>
      <main class="content">
        <h1>Personagens</h1>
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <ul v-else-if="characters?.length" class="list">
          <li v-for="c in characters" :key="c.id">
            <CharacterCard :character="c" />
          </li>
        </ul>
        <div v-else-if="characters" class="empty">
          <p class="empty-title">Nenhum personagem ainda</p>
          <p class="empty-text">
            Escolha um sistema e monte a primeira ficha. O rascunho fica salvo enquanto você monta.
          </p>
        </div>
      </main>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.mark {
  flex-shrink: 0;
}

.brand {
  flex-grow: 1;
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.account {
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  text-decoration: none;
}

.account span {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: var(--text-sm);
  font-weight: 700;
}

.content {
  padding: var(--space-2) var(--space-4) var(--space-4);
}

h1 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.list {
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.error {
  margin: var(--space-4) 0 0;
  font-weight: 600;
  color: var(--color-danger);
}

.empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-1);
}

.empty-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.empty-text {
  margin: 0;
  max-width: 28em;
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>
