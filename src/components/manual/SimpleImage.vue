<template>
  <div class="simple-image-container">
    <div class="image-header">
      <slot name="header">
        <p>{{ title }}</p>
      </slot>
    </div>
    
    <div class="image-wrapper">
      <img 
        :src="imageUrl" 
        :alt="imageAlt"
        @load="onImageLoad"
        @error="onImageError"
      />
      
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>
      
      <div v-if="hasError" class="error-overlay">
        <div class="error-icon">⚠️</div>
        <div class="error-text">Ошибка загрузки изображения</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  imageUrl: string
  imageAlt?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  imageAlt: 'Image',
  title: 'Изображение'
})

const emit = defineEmits<{
  load: [event: Event]
  error: [event: Event]
}>()

const isLoading = ref(true)
const hasError = ref(false)

const onImageLoad = (event: Event) => {
  isLoading.value = false
  hasError.value = false
  emit('load', event)
}

const onImageError = (event: Event) => {
  isLoading.value = false
  hasError.value = true
  emit('error', event)
}
</script>

<style scoped>
.simple-image-container {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  background-color: var(--bg-color-secondary);
}

.image-header {
  text-align: center;
  padding: var(--spacing-sm);
  background-color: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
}

.image-header p {
  margin: 0;
  font-weight: 600;
  color: var(--text-color);
}

.image-wrapper {
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-wrapper img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-sm);
  opacity: 0.5;
}

.error-text {
  color: var(--text-color-secondary);
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .image-wrapper {
    min-height: 200px;
  }
  
  .error-icon {
    font-size: 32px;
  }
}
</style>