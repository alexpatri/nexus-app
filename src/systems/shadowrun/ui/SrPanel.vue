<script setup lang="ts">
// Cartão de seção: o cartão do Nexus com o cabeçalho em carmim, eco das abas
// da ficha do livro. O valor da seção (custo, total) vai em meta.
defineProps<{ title: string; titleId?: string }>()
</script>

<template>
  <section class="panel">
    <h2 :id="titleId" class="head">
      <span>{{ title }}</span>
      <span v-if="$slots.meta" class="meta numeric"><slot name="meta" /></span>
    </h2>
    <div class="body"><slot /></div>
  </section>
</template>

<style scoped>
.panel {
  border: var(--border-width) solid var(--color-rule);
  border-radius: var(--nx-radius-card);
  background: var(--color-surface-raised);
  overflow: hidden;
}

.head {
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 9px var(--space-4);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.4;
}

.meta {
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--space-3) var(--space-4);
}

/* A última linha de uma lista dentro do cartão não leva fio. */
.body :deep(ul > li:last-child),
.body :deep(.row:last-child) {
  border-bottom: 0;
}
</style>
