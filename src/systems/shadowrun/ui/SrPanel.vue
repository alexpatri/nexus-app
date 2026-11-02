<script setup lang="ts">
// Painel da ficha do livro: aba carmim inclinada encaixada sobre uma moldura
// fina de cantos chanfrados.
defineProps<{ title: string }>()
</script>

<template>
  <section class="panel">
    <h2 class="tab">{{ title }}</h2>
    <div class="frame">
      <div class="inner"><slot /></div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
}

.tab {
  align-self: flex-start;
  margin: 0;
  padding: 7px 30px 7px 12px;
  background: var(--sr-carmine);
  color: var(--sr-on-dark);
  font-family: var(--font-display);
  font-size: 0.6875rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  clip-path: var(--sr-tab);
}

.frame {
  padding: 1px;
  background: var(--sr-carmine);
  clip-path: var(--sr-chamfer);
}

.inner {
  padding: 2px var(--space-3);
  background: var(--color-surface-raised);
  clip-path: var(--sr-chamfer);
}
</style>
