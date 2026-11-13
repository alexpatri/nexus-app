<script setup lang="ts">
import { computed } from 'vue'

// Orçamento em segmentos, como o progresso do cartão de personagem do Nexus:
// gasto em carmim, livre em fio; acima do total, os segmentos a mais ficam no
// vermelho de alerta. Com quarters, cada ponto vira quatro segmentos juntos
// (pontos de poder).
const props = defineProps<{ label: string; total: number; spent: number; quarters?: boolean }>()

// Acima disso, os segmentos quebram em mais de uma linha.
const PER_ROW = 24

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
// Linhas do mesmo tamanho: 28 vira 14 + 14, não 24 + 4.
const columns = computed(() => {
  const n = groups.value.length
  if (n === 0) return 1
  const rows = Math.ceil(n / (props.quarters ? PER_ROW / 4 : PER_ROW))
  return Math.ceil(n / rows)
})
const n = (x: number) => String(Math.abs(x)).replace('.', ',')
</script>

<template>
  <section class="budget" :aria-label="`Orçamento: ${label}`">
    <div class="head">
      <span class="label">{{ label }}</span>
      <span :class="['left', { over: left < 0 }]">
        <strong class="numeric">{{ n(left) }}</strong>
        {{ left >= 0 ? `de ${n(total)} restantes` : `acima de ${n(total)}` }}
      </span>
    </div>
    <div
      :class="['boxes', { quarters }]"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <span v-for="(g, i) in groups" :key="i" class="cells">
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
  font-size: var(--text-sm);
  font-weight: 700;
}

.left {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.left strong {
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--color-text);
}

.left.over,
.left.over strong {
  font-weight: 700;
  color: var(--color-danger);
}

.boxes {
  display: grid;
  gap: 3px;
}

.boxes.quarters {
  gap: 6px;
}

.cells {
  display: flex;
  gap: 1px;
}

.cells > span {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--color-rule);
}

.quarters .cells > span {
  border-radius: 1px;
}

.quarters .cells > span:first-child {
  border-radius: 3px 1px 1px 3px;
}

.quarters .cells > span:last-child {
  border-radius: 1px 3px 3px 1px;
}

.cells > .spent {
  background: var(--color-accent);
}

.cells > .over {
  background: var(--color-danger);
}
</style>
