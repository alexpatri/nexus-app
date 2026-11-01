<script setup lang="ts">
import { IonBackButton, IonButtons, IonHeader, IonToolbar } from '@ionic/vue'
import { chevronBack } from 'ionicons/icons'

defineProps<{ back?: string }>()
</script>

<template>
  <IonHeader class="ion-no-border">
    <IonToolbar>
      <div class="bar" :class="{ 'with-back': back }">
        <IonButtons v-if="back">
          <IonBackButton :default-href="back" :icon="chevronBack" text="" aria-label="Voltar" />
        </IonButtons>
        <slot />
      </div>
    </IonToolbar>
  </IonHeader>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 60px;
  padding: 0 var(--space-2) 0 var(--space-4);
}

.bar.with-back {
  gap: var(--space-1);
  padding-left: var(--space-2);
}

.bar :slotted(h1) {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}
</style>
