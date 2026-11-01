<script setup lang="ts">
import { computed, ref, useId, useSlots } from 'vue'

const props = defineProps<{
  label: string
  type?: 'text' | 'email' | 'password'
  autocomplete?: string
  inputmode?: 'text' | 'email'
  hint?: string
}>()

const model = defineModel<string>({ required: true })

const id = useId()
const hintId = `${id}-hint`
const belowId = `${id}-below`
const slots = useSlots()
const describedBy = computed(
  () => [props.hint && hintId, slots.default && belowId].filter(Boolean).join(' ') || undefined,
)
const shown = ref(false)
const isPassword = computed(() => props.type === 'password')
const inputType = computed(() =>
  isPassword.value && shown.value ? 'text' : (props.type ?? 'text'),
)
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <div class="control">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :aria-describedby="describedBy"
        :class="{ 'with-toggle': isPassword }"
      />
      <button
        v-if="isPassword"
        type="button"
        class="toggle"
        :aria-pressed="shown"
        aria-label="Mostrar senha"
        @click="shown = !shown"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          <path v-if="shown" d="M3 3l18 18" />
        </svg>
      </button>
    </div>
    <span v-if="hint" :id="hintId" class="hint">{{ hint }}</span>
    <div v-if="$slots.default" :id="belowId">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
}

.control {
  position: relative;
}

input {
  width: 100%;
  height: 52px;
  box-sizing: border-box;
  padding: 0 14px;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-size: 1.0625rem;
}

input.with-toggle {
  padding-right: 60px;
}

.toggle {
  position: absolute;
  top: 4px;
  right: 4px;
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
