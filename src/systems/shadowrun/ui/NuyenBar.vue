<script setup lang="ts">
import { computed } from 'vue'

// Nuyen não cabe em caixas (frontend-design-shadowrun.md): valor restante
// grande, total ao lado e uma barra de 8px; acima do total, em carmim.
const props = defineProps<{ total: number; spent: number }>()

const fmt = new Intl.NumberFormat('pt-BR')
const left = computed(() => props.total - props.spent)
const fill = computed(() =>
  props.total > 0 ? Math.min(100, (props.spent / props.total) * 100) : props.spent > 0 ? 100 : 0,
)
</script>

<template>
  <section class="nuyen" aria-label="Orçamento: nuyen">
    <div class="head">
      <span :class="['left', 'numeric', { over: left < 0 }]">
        {{ fmt.format(Math.abs(left)) }} ¥
        <span class="tail">{{ left < 0 ? 'acima' : 'restantes' }}</span>
      </span>
      <span class="total numeric">de {{ fmt.format(total) }} ¥</span>
    </div>
    <div class="bar" aria-hidden="true">
      <span :class="{ over: left < 0 }" :style="{ width: `${fill}%` }" />
    </div>
  </section>
</template>

<style scoped>
.nuyen {
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

.left {
  font-size: 1.375rem;
  font-weight: 700;
}

.left.over {
  color: var(--color-danger);
}

.tail,
.total {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-muted);
}

.bar {
  height: 8px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
}

.bar span {
  display: block;
  height: 100%;
  background: var(--sr-print);
}

.bar .over {
  background: var(--color-danger);
}
</style>
