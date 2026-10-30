<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/vue'

import NexusMark from '@/design/NexusMark.vue'
</script>

<template>
  <IonPage>
    <IonHeader class="ion-no-border">
      <IonToolbar>
        <div class="bar">
          <NexusMark />
          <span class="brand">Nexus</span>
        </div>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      <main class="content">
        <h1>Personagens</h1>
        <div class="empty">
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
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 60px;
  padding: 0 var(--space-2) 0 var(--space-4);
}

.brand {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
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
