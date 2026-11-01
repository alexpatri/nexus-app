<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'danger' | 'text'
    type?: 'button' | 'submit'
    busy?: boolean
  }>(),
  { variant: 'primary', type: 'button', busy: false },
)
</script>

<template>
  <button :type="type" :class="['button', variant]" :disabled="busy" :aria-busy="busy">
    <slot />
  </button>
</template>

<style scoped>
.button {
  height: 52px;
  padding: 0 var(--space-4);
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: var(--text-md);
  font-weight: 700;
  cursor: pointer;
}

.button:disabled {
  cursor: progress;
  opacity: 0.7;
}

.primary {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.danger {
  border: var(--border-width) solid var(--color-danger);
  background: var(--color-surface-raised);
  color: var(--color-danger);
}

.text {
  height: var(--touch-min);
  background: transparent;
  color: var(--color-text);
  font-weight: 600;
}
</style>
