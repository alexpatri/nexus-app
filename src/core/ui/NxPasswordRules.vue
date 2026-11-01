<script setup lang="ts">
import { computed } from 'vue'

import { checkPassword } from '@/core/validation/auth'

const props = defineProps<{ password: string }>()
const rules = computed(() => checkPassword(props.password))
</script>

<template>
  <ul class="rules">
    <li v-for="rule in rules" :key="rule.id" :class="{ ok: rule.ok }">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path v-if="rule.ok" d="M5 12.5l4.5 4.5L19 7.5" />
        <path v-else d="M7 7l10 10M17 7L7 17" />
      </svg>
      {{ rule.label }}
      <span class="visually-hidden">{{ rule.ok ? ': atendida' : ': falta' }}</span>
    </li>
  </ul>
</template>

<style scoped>
.rules {
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-danger);
}

li.ok {
  color: var(--color-success);
}

svg {
  flex-shrink: 0;
}
</style>
