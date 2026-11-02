<script setup lang="ts">
// Valor escolhido entre − e + de 44px, travando nos limites.
const props = defineProps<{ value: number; min: number; max?: number; label: string }>()
const emit = defineEmits<{ change: [value: number] }>()
</script>

<template>
  <div class="stepper" role="group" :aria-label="label">
    <button
      type="button"
      class="sr-outline"
      :aria-label="`Diminuir ${label}`"
      :disabled="value <= props.min"
      @click="emit('change', value - 1)"
    >
      <span>−</span>
    </button>
    <output class="numeric">{{ value }}</output>
    <button
      type="button"
      class="sr-outline"
      :aria-label="`Aumentar ${label}`"
      :disabled="props.max !== undefined && value >= props.max"
      @click="emit('change', value + 1)"
    >
      <span>+</span>
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
  font-size: 1.375rem;
  line-height: 1;
}

output {
  min-width: 2ch;
  text-align: center;
  font-size: 1.625rem;
  font-weight: 700;
  color: var(--sr-pen);
}
</style>
