<script setup lang="ts">
import { computed } from 'vue'

// Orçamento em caixas (frontend-design-shadowrun.md): gasto em tinta, livre em
// caixa vazia; acima do total, as caixas a mais ficam em carmim.
// Com quarters, cada ponto vira quatro caixas agrupadas (pontos de poder).
const props = defineProps<{ label: string; total: number; spent: number; quarters?: boolean }>()

const per = computed(() => (props.quarters ? 4 : 1))
const left = computed(() => props.total - props.spent)
const groups = computed(() => {
  const total = Math.round(props.total * per.value)
  const spent = Math.round(props.spent * per.value)
  const cells = Array.from({ length: Math.max(total, spent) }, (_, i) =>
    i >= total ? 'over' : i < spent ? 'spent' : 'free',
  )
  const out: string[][] = []
  for (let i = 0; i < cells.length; i += per.value) out.push(cells.slice(i, i + per.value))
  return out
})
const n = (x: number) => String(Math.abs(x)).replace('.', ',')
</script>

<template>
  <section class="budget" :aria-label="`Orçamento: ${label}`">
    <div class="head">
      <span class="label">{{ label }}</span>
      <span :class="['left', 'numeric', { over: left < 0 }]">
        {{ left >= 0 ? `${n(left)} de ${n(total)} restantes` : `${n(left)} acima de ${n(total)}` }}
      </span>
    </div>
    <div :class="['boxes', { quarters }]" aria-hidden="true">
      <span v-for="(g, i) in groups" :key="i" class="group">
        <span v-for="(b, j) in g" :key="j" :class="b" />
      </span>
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

.boxes,
.group {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.boxes.quarters {
  gap: var(--space-2);
}

.group span {
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface-raised);
}

.group .spent {
  border-color: var(--sr-print);
  background: var(--sr-print);
}

.group .over {
  border-color: var(--color-danger);
  background: var(--color-danger);
}
</style>
