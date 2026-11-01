<script setup lang="ts">
import { IonModal } from '@ionic/vue'
import { useId } from 'vue'

defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { required: true })
const titleId = useId()
</script>

<template>
  <IonModal
    :is-open="open"
    class="confirm-sheet"
    :aria-labelledby="titleId"
    @did-dismiss="open = false"
  >
    <section class="sheet">
      <h2 :id="titleId">{{ title }}</h2>
      <slot />
    </section>
  </IonModal>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 20px var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom));
  background: var(--color-surface-raised);
  color: var(--color-text);
}

h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.sheet :slotted(p) {
  margin: 0;
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>

<style>
/* A folha cresce com o conteúdo e fica presa ao pé da tela. */
ion-modal.confirm-sheet {
  --height: auto;
  --width: 100%;
  --max-width: 560px;
  --border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  --backdrop-opacity: 0.5;
  align-items: flex-end;
}
</style>
