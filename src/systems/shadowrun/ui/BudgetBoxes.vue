<script setup lang="ts">
import { computed } from 'vue'

// Orçamento em caixas (frontend-design-shadowrun.md): gasto em tinta, livre em
// caixa vazia; acima do total, as caixas a mais ficam em carmim.
const props = defineProps<{ label: string; total: number; spent: number }>()

const left = computed(() => props.total - props.spent)
const boxes = computed(() =>
  Array.from({ length: Math.max(props.total, props.spent) }, (_, i) =>
    i >= props.total ? 'over' : i < props.spent ? 'spent' : 'free',
  ),
)
</script>

<template>
  <section class="budget" :aria-label="`Orçamento: ${label}`">
    <div class="head">
      <span class="label">{{ label }}</span>
      <span :class="['left', 'numeric', { over: left < 0 }]">
        {{ left >= 0 ? `${left} de ${total} restantes` : `${-left} acima de ${total}` }}
      </span>
    </div>
    <div class="boxes" aria-hidden="true">
      <span v-for="(b, i) in boxes" :key="i" :class="b" />
    </div>
  </section>
</template>

<style scoped>
.budget {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
}

.left {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.left.over {
  font-weight: 700;
  color: var(--color-danger);
}

.boxes {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.boxes span {
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface-raised);
}

.boxes .spent {
  border-color: var(--sr-print);
  background: var(--sr-print);
}

.boxes .over {
  border-color: var(--color-danger);
  background: var(--color-danger);
}
</style>
