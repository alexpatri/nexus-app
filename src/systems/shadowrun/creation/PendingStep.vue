<template>
  <div class="pending">
    <p class="title">Este passo ainda não está no app</p>
    <p class="text">
      O rascunho continua salvo. Os passos chegam um a um, e a ficha segue daqui quando este estiver
      pronto.
    </p>
  </div>
</template>

<style scoped>
.pending {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5) 0;
}

.title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.text {
  margin: 0;
  max-width: 28em;
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>
