<script setup lang="ts">
// Trunfo como na ficha do livro: um hexágono por ponto, cheio até o valor.
const props = defineProps<{ value: number; max: number; label: string }>()
const cells = () =>
  Array.from({ length: Math.max(props.max, props.value) }, (_, i) => i < props.value)
</script>

<template>
  <span class="hexes" role="img" :aria-label="`${label} ${value} de ${max}`">
    <span v-for="(on, i) in cells()" :key="i" :class="{ on }" />
  </span>
</template>

<style scoped>
.hexes {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.hexes span {
  width: 18px;
  height: 21px;
  background: var(--color-rule);
  clip-path: var(--sr-hex);
}

.hexes .on {
  background: var(--sr-carmine);
}
</style>
