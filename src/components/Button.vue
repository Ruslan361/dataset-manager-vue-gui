<script setup lang="ts">
interface Props {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'primary',
  size: 'medium',
  disabled: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<template>
  <button 
    :type="props.type"
    :disabled="props.disabled"
    :class="['btn', `btn--${props.variant}`, `btn--${props.size}`]"
    @click="handleClick"
  >
    <slot></slot>
  </button>
</template>

<style scoped>
.btn {
  border: none;
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  font-weight: 500;
  transition: var(--transition-base, 250ms ease);
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  opacity: 0.9;
}

/* Размеры */
.btn--small {
  padding: 6px 12px;
  font-size: var(--font-size-sm, 14px);
}

.btn--medium {
  padding: 12px 24px;
  font-size: var(--font-size-base, 16px);
}

.btn--large {
  padding: 16px 32px;
  font-size: var(--font-size-lg, 18px);
}

/* Варианты */
.btn--primary {
  background: var(--primary-color, #3b82f6);
  color: var(--text-color-button, #ffffff);
}

.btn--secondary {
  background: var(--secondary-color, #6b7280);
  color: var(--text-color-button, #ffffff);
}

.btn--success {
  background: var(--success-color, #10b981);
  color: var(--text-color-button, #ffffff);
}

.btn--warning {
  background: var(--warning-color, #f59e0b);
  color: var(--text-color-button, #ffffff);
}

.btn--error {
  background: var(--error-color, #ef4444);
  color: var(--text-color-button, #ffffff);
}
</style>