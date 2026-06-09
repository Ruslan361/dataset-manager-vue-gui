<script setup lang="ts">
import { ref, computed } from 'vue'
import { imagesAPI, type Image } from '@/api/images'
import ImageCard from '@/components/common/ImageCard.vue'

interface Props {
  images: Image[]
  selectedImageId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  imageSelect: [imageId: number]
  imageDeleted: [imageId: number]
}>()

const isDeleting = ref<Set<number>>(new Set())
const deletedImages = ref<Set<number>>(new Set())

const availableImages = computed(() => 
  props.images.filter(img => !deletedImages.value.has(img.id))
)

const handleImageClick = (imageId: number) => {
  if (deletedImages.value.has(imageId)) return
  emit('imageSelect', imageId)
}

const handleImageSelect = (imageId: number, selected: boolean) => {
  if (selected) {
    emit('imageSelect', imageId)
  }
}

const handleImageDelete = async (imageId: number) => {
  try {
    isDeleting.value.add(imageId)
    
    const result = await imagesAPI.removeImage(imageId)
    if (result.success) {
      deletedImages.value.add(imageId)
      emit('imageDeleted', imageId)
    } else {
      console.error('Failed to delete image:', result.message)
      alert(result.message || 'Ошибка при удалении изображения')
    }
  } catch (err) {
    console.error('Error deleting image:', err)
    alert('Ошибка при удалении изображения')
  } finally {
    isDeleting.value.delete(imageId)
  }
}
</script>

<template>
  <div class="image-strip">
    <div class="image-list">
      
      <div
        v-for="image in availableImages"
        :key="image.id"
        class="image-card-wrapper"
        :class="{ 
          selected: selectedImageId === image.id,
          deleting: isDeleting.has(image.id)
        }"
      >
        <ImageCard
          :id="image.id"
          :filename="image.filename"
          :original-filename="image.original_filename"
          :is-selected="selectedImageId === image.id"
          :show-checkbox="false"
          :is-compact="true"
          @click="handleImageClick"
          @select="handleImageSelect"
          @delete="handleImageDelete"
        />
      </div>
      
      
      <div
        v-for="imageId in Array.from(deletedImages)"
        :key="`deleted-${imageId}`"
        class="deleted-item"
      >
        <div class="deleted-icon">🗑️</div>
        <div class="deleted-text">
          <div class="deleted-title">Изображение удалено</div>
          <div class="deleted-subtitle">ID: {{ imageId }}</div>
          <div class="deleted-message">Выберите другое изображение для анализа</div>
        </div>
      </div>
    </div>
    
    
    <div v-if="availableImages.length === 0 && deletedImages.size === 0" class="empty-strip">
      <div class="empty-icon">📷</div>
      <div class="empty-text">Нет изображений для анализа</div>
    </div>
  </div>
</template>

<style scoped>
.image-strip {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.image-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  min-height: 0;
}

.image-card-wrapper {
  transition: all 0.2s ease;
  border-radius: var(--border-radius);
  overflow: hidden;
  flex-shrink: 0;
  min-height: 200px;
  width: 100%;
}

.image-card-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.image-card-wrapper.selected {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.image-card-wrapper.deleting {
  opacity: 0.6;
  pointer-events: none;
  filter: grayscale(1);
}

.deleted-item {
  background-color: var(--error-color);
  color: white;
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  flex-shrink: 0;
  min-height: 80px;
}

.deleted-icon {
  font-size: 20px;
  opacity: 0.8;
  flex-shrink: 0;
}

.deleted-text {
  flex: 1;
  min-width: 0;
}

.deleted-title {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.deleted-subtitle {
  font-size: var(--font-size-xs);
  opacity: 0.8;
  margin-bottom: var(--spacing-xs);
}

.deleted-message {
  font-size: var(--font-size-xs);
  opacity: 0.7;
  line-height: 1.3;
}

.empty-strip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-text {
  font-size: var(--font-size-base);
}
.image-list::-webkit-scrollbar {
  width: 8px;
}

.image-list::-webkit-scrollbar-track {
  background: var(--bg-color-secondary);
  border-radius: 4px;
  margin: var(--spacing-sm) 0;
}

.image-list::-webkit-scrollbar-thumb {
  background: var(--border-color-hover);
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.image-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary);
}

.image-list::-webkit-scrollbar-thumb:active {
  background: var(--primary-color);
}
.image-list {
  scrollbar-width: thin;
  scrollbar-color: var(--border-color-hover) var(--bg-color-secondary);
}
@media (max-width: 768px) {
  .image-list {
    padding: var(--spacing-sm);
  }
  
  .image-card-wrapper {
    min-height: 150px;
  }
  
  .deleted-item {
    padding: var(--spacing-sm);
    min-height: 60px;
  }
  
  .deleted-icon {
    font-size: 18px;
  }
  .image-list::-webkit-scrollbar {
    width: 6px;
  }
}
.image-list {
  scroll-behavior: smooth;
}
.image-list.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.image-list.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>