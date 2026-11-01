<script setup lang="ts">
import { computed } from 'vue'

import { moduleFor } from '@/systems'

const props = defineProps<{ system: string; version: string }>()

const brand = computed(() => moduleFor(props.system, props.version)?.brand)
// Sistema sem módulo no app (catálogo sem telas) ainda aparece, com a faixa neutra.
const style = computed(() =>
  brand.value
    ? { background: brand.value.cardArt ?? brand.value.accent, color: brand.value.ink }
    : undefined,
)
</script>

<template>
  <div class="band" :style="style">
    <span>{{ brand?.name ?? system }}</span>
    <span class="edition">{{ brand?.edition ?? version }}</span>
  </div>
</template>

<style scoped>
.band {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 800;
}

.edition {
  font-weight: 600;
}
</style>
