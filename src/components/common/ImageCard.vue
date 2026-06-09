<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { imagesAPI } from '@/api/images'

interface Props {
  id: number
  filename: string
  originalFilename?: string
  isSelected?: boolean
  showCheckbox?: boolean
  isCompact?: boolean
  placeholderUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  showCheckbox: true,
  isCompact: false,
  placeholderUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPgogICAgSXdhYnJhemhlbmllIG5lIHNuYWpkZW5vCiAgPC90ZXh0Pgo8L3N2Zz4='
})

const emit = defineEmits<{
  click: [imageId: number]
  select: [imageId: number, selected: boolean]
  delete: [imageId: number]
}>()

const isLoading = ref(true)
const hasError = ref(false)
const isDeleting = ref(false)
const imageBase64 = ref<string | null>(null)

// Отображаемое имя файла
const displayName = computed(() => 
  props.originalFilename || props.filename
)

// URL изображения - используем base64 или плейсхолдер
const imageUrl = computed(() => {
  if (imageBase64.value) {
    return imageBase64.value
  }
  if (hasError.value) {
    return props.placeholderUrl
  }
  return props.placeholderUrl
})

// Загрузка изображения через API
const loadImage = async () => {
  try {
    isLoading.value = true
    hasError.value = false
    imageBase64.value = null
    
    console.log(`Loading image ${props.id}...`)
    
    // Используем downloadImage для получения base64
    const base64Data = await imagesAPI.getImageBase64(props.id)
    
    if (base64Data) {
      // Проверяем, есть ли уже префикс data:image
      if (base64Data.startsWith('data:image')) {
        imageBase64.value = base64Data
      } else {
        // Добавляем префикс для base64 (предполагаем JPEG, но можно определить по файлу)
        imageBase64.value = `data:image/jpeg;base64,${base64Data}`
      }
      console.log(`Image ${props.id} loaded successfully`)
    } else {
      throw new Error('No image data received')
    }
  } catch (error) {
    console.error(`Error loading image ${props.id}:`, error)
    hasError.value = true
    imageBase64.value = null
  } finally {
    isLoading.value = false
  }
}

// Обработчики событий
const handleImageClick = () => {
  if (isDeleting.value) return
  emit('click', props.id)
}

const handleCheckboxClick = (event: Event) => {
  event.stopPropagation()
  if (isDeleting.value) return
  
  console.log(`Checkbox clicked for image ${props.id}, current state: ${props.isSelected}`)
  emit('select', props.id, !props.isSelected)
}

const handleDeleteClick = (event: Event) => {
  event.stopPropagation()
  if (isDeleting.value) return
  
  isDeleting.value = true
  emit('delete', props.id)
  
  // Сбрасываем состояние через некоторое время на случай если удаление не удалось
  setTimeout(() => {
    isDeleting.value = false
  }, 5000)
}

const handleImageLoad = () => {
  // Изображение загружено успешно
  console.log(`Image ${props.id} rendered successfully`)
}

const handleImageError = () => {
  console.error(`Error rendering image ${props.id}`)
  hasError.value = true
}

// Загружаем изображение при монтировании и при изменении ID
onMounted(() => {
  loadImage()
})

watch(() => props.id, () => {
  loadImage()
})
</script>

<template>
  <div 
    class="image-card" 
    :class="{ 
      selected: isSelected, 
      deleting: isDeleting,
      compact: isCompact
    }"
    @click="handleImageClick"
  >
    <!-- Чекбокс для выбора (только если showCheckbox === true) -->
    <div 
      v-if="showCheckbox" 
      class="image-checkbox"
      @click="handleCheckboxClick"
    >
      <input
        type="checkbox"
        :checked="isSelected"
        class="checkbox-input"
        @click.stop
        @change="handleCheckboxClick"
      />
    </div>

    <!-- Контейнер изображения -->
    <div class="image-container">
      <!-- Плейсхолдер загрузки -->
      <div v-if="isLoading" class="image-placeholder">
        <div class="loading-spinner"></div>
        <div class="loading-text">Загрузка...</div>
      </div>

      <!-- Изображение -->
      <img
        v-else-if="!hasError && imageBase64"
        :src="imageUrl"
        :alt="displayName"
        class="image"
        loading="lazy"
        @load="handleImageLoad"
        @error="handleImageError"
      />

      <!-- Плейсхолдер ошибки -->
      <div v-else class="error-placeholder">
        <div class="error-icon">❌</div>
        <div class="error-text">Ошибка загрузки</div>
        <button 
          class="retry-btn"
          @click.stop="loadImage"
          title="Повторить загрузку"
        >
          🔄
        </button>
      </div>

      <!-- Оверлей с кнопкой удаления -->
      <div v-if="!isLoading" class="image-overlay">
        <button
          class="delete-btn"
          @click="handleDeleteClick"
          :disabled="isDeleting"
          title="Удалить изображение"
        >
          <span v-if="isDeleting">⏳</span>
          <span v-else>🗑️</span>
        </button>
      </div>
    </div>

    <!-- Информация об изображении -->
    <div v-if="!isCompact" class="image-info">
      <div class="image-title" :title="displayName">
        {{ displayName }}
      </div>
      <div class="image-id">ID: {{ id }}</div>
    </div>

    <!-- Компактная информация -->
    <div v-else class="image-info-compact">
      <div class="image-title-compact" :title="displayName">
        {{ displayName }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-card {
  position: relative;
  border-radius: var(--border-radius);
  overflow: hidden;
  background-color: var(--bg-color);
  border: 2px solid var(--border-color);
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;
}

.image-card:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.image-card.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.image-card.deleting {
  opacity: 0.6;
  pointer-events: none;
}

.image-card.compact {
  border-width: 1px;
}

.image-checkbox {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: var(--border-radius);
  padding: var(--spacing-xs);
  transition: all 0.2s ease;
}

.checkbox-input {
  margin: 0;
  cursor: pointer;
}

.image-container {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.image-card.compact .image-container {
  height: 120px;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-card:hover .image {
  transform: scale(1.05);
}

.image-placeholder,
.error-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color-secondary);
  gap: var(--spacing-sm);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 24px;
  margin-bottom: var(--spacing-xs);
  opacity: 0.5;
}

.error-text {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  text-align: center;
  margin-bottom: var(--spacing-sm);
}

.retry-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: var(--primary-color-dark);
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom, 
    rgba(0,0,0,0.6) 0%, 
    transparent 30%, 
    transparent 70%, 
    rgba(0,0,0,0.6) 100%
  );
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: var(--spacing-sm);
}

.image-card:hover .image-overlay {
  opacity: 1;
}

.delete-btn {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.image-card.compact .delete-btn {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.delete-btn:hover {
  background: var(--error-color);
  color: white;
  transform: scale(1.1);
}

.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.image-info {
  padding: var(--spacing-md);
}

.image-info-compact {
  padding: var(--spacing-sm);
}

.image-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: var(--spacing-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.image-title-compact {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.image-id {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
  margin: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .image-container {
    height: 150px;
  }
  
  .image-card.compact .image-container {
    height: 100px;
  }
  
  .image-info {
    padding: var(--spacing-sm);
  }
  
  .delete-btn {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}
</style>