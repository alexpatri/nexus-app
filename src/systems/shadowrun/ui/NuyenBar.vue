<script setup lang="ts">
import { computed } from 'vue'

// Nuyen não cabe em segmentos: cartão do Nexus com o valor restante grande,
// o total ao lado e uma barra contínua; acima do total, em alerta.
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
  border: var(--border-width) solid var(--color-rule);
  border-radius: var(--nx-radius-card);
  background: var(--color-surface-raised);
}

.line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.label {
  font-size: var(--text-sm);
  font-weight: 700;
}

.essence,
.tail {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.total {
  font-family: var(--font-numeric);
  font-size: 1.125rem;
  color: var(--color-text-muted);
}

.essence strong {
  font-family: var(--font-numeric);
  font-size: 1.1875rem;
  font-weight: 600;
  color: var(--color-text);
}

.left {
  font-family: var(--font-numeric);
  font-size: 2.125rem;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.left .tail {
  font-family: var(--font-body);
  font-weight: 400;
}

.left.over {
  color: var(--color-danger);
}

.bar {
  height: 6px;
  border-radius: 3px;
  background: var(--color-surface-sunken);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--color-accent);
}

.bar .over {
  background: var(--color-danger);
}
</style>
