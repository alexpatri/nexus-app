<script setup lang="ts">
import { computed } from 'vue'

// Nuyen não cabe em caixas: painel de ardósia como o bloco de estatísticas do
// livro, valor restante grande, total ao lado e barra âmbar; acima do total, em
// alerta.
const props = defineProps<{ total: number; spent: number; essence?: string }>()

const fmt = new Intl.NumberFormat('pt-BR')
const left = computed(() => props.total - props.spent)
const fill = computed(() =>
  props.total > 0 ? Math.min(100, (props.spent / props.total) * 100) : props.spent > 0 ? 100 : 0,
)
</script>

<template>
  <section class="nuyen" aria-label="Orçamento: nuyen">
    <div class="line">
      <span class="label">Nuyen</span>
      <span v-if="essence" class="essence"
        >Essência <strong>{{ essence }}</strong></span
      >
    </div>
    <div class="line">
      <span :class="['left', { over: left < 0 }]">
        {{ fmt.format(Math.abs(left)) }} ¥
        <span class="tail">{{ left < 0 ? 'acima' : 'restantes' }}</span>
      </span>
      <span class="total">de {{ fmt.format(total) }} ¥</span>
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
  padding: 14px var(--space-4);
  background: var(--sr-slate);
  color: var(--sr-on-dark);
  font-family: var(--font-numeric);
  clip-path: var(--sr-chamfer);
}

.line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--sr-amber);
}

.essence,
.total,
.tail {
  font-size: 1.0625rem;
  font-weight: 400;
  color: var(--sr-on-dark-muted);
}

.essence strong {
  font-size: 1.1875rem;
  color: var(--sr-on-dark);
}

.left {
  font-size: 2.125rem;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.left.over {
  color: #ff8a80;
}

.bar {
  height: 6px;
  background: var(--sr-slate-2);
}

.bar span {
  display: block;
  height: 100%;
  background: var(--sr-amber);
}

.bar .over {
  background: #ff8a80;
}
</style>
