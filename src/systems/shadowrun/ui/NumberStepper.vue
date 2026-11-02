<script setup lang="ts">
// Valor escolhido entre − e + de 44px, travando nos limites.
const props = defineProps<{ value: number; min: number; max?: number; label: string }>()
const emit = defineEmits<{ change: [value: number] }>()
</script>

<template>
  <div class="stepper" role="group" :aria-label="label">
    <button
      type="button"
      :aria-label="`Diminuir ${label}`"
      :disabled="value <= props.min"
      @click="emit('change', value - 1)"
    >
      −
    </button>
    <output class="numeric">{{ value }}</output>
    <button
      type="button"
      :aria-label="`Aumentar ${label}`"
      :disabled="props.max !== undefined && value >= props.max"
      @click="emit('change', value + 1)"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

button {
  width: var(--touch-min);
  height: var(--touch-min);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: 1.375rem;
  cursor: pointer;
}

button:disabled {
  border-color: var(--color-surface-sunken);
  background: transparent;
  color: var(--color-rule);
  cursor: not-allowed;
}

output {
  min-width: 2ch;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--sr-pen);
}
</style>
