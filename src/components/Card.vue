<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

</script>

<template>
    <div class="card-container">
        <div class="card">
            <slot></slot>
        </div>
  </div>
</template>

<style scoped>
.card-container {
  /* Полное центрирование по вертикали и горизонтали */
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: var(--spacing-md, 16px);
}

.card {
  /* Размеры */
  max-width: 400px;
  width: 100%;
  
  /* Закругленные края */
  border-radius: var(--border-radius, 12px);
  
  /* Стили */
  background-color: var(--bg-color, white);
  border: 1px solid var(--border-color, #e5e5e5);
  padding: var(--spacing-lg, 24px);
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
}
</style>