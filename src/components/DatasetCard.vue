<script setup lang="ts">
import { ASSETS } from '@/config/constants'

interface Props {
  id: string
  title: string
  description?: string
  previewImage?: string
  createdAt?: Date
  itemsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  description: 'Описание отсутствует',
  previewImage: ASSETS.placeholderDataset,
  itemsCount: 0
})

const emit = defineEmits<{
  click: [id: string]
  delete: [id: number]
}>()

const handleClick = () => {
  emit('click', props.id)
}

const handleDelete = (event: Event) => {
  event.stopPropagation()
  emit('delete', parseInt(props.id))
}

const formatDate = (date?: Date) => {
  if (!date) return 'Неизвестно'
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const handleImageError = (e: Event) => {
  (e.target as HTMLImageElement).src = ASSETS.placeholderDataset
}
</script>

<template>
  <div class="dataset-card" @click="handleClick">
    <div class="dataset-card__preview">
      <img 
        :src="previewImage" 
        :alt="title"
        class="dataset-card__image"
        @error="handleImageError"
      >
      <div class="dataset-card__overlay">
        <span class="dataset-card__items-count">{{ itemsCount }} элементов</span>
      </div>
      <div class="dataset-card__actions">
        <button 
          class="delete-button"
          @click="handleDelete"
          title="Удалить датасет"
        >
          ×
        </button>
      </div>
    </div>
    
    <div class="dataset-card__content">
      <h3 class="dataset-card__title">{{ title }}</h3>
      <p class="dataset-card__description">{{ description }}</p>
      <div class="dataset-card__footer">
        <span class="dataset-card__date">{{ formatDate(createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dataset-card {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-large);
  overflow: hidden;
  cursor: pointer;
  transition: var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.dataset-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-hover);
}

.dataset-card__preview {
  position: relative;
  aspect-ratio: 16/10;
  overflow: hidden;
}

.dataset-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition-base);
}

.dataset-card:hover .dataset-card__image {
  transform: scale(1.05);
}

.dataset-card__overlay {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
}

.dataset-card__items-count {
  background-color: rgba(0, 0, 0, 0.7);
  color: var(--text-color-button);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-small);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.dataset-card__actions {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
}

.delete-button {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--error-color);
  color: var(--text-color-button);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  transition: var(--transition-base);
  opacity: 0;
}

.dataset-card:hover .delete-button {
  opacity: 1;
}

.delete-button:hover {
  background-color: #dc2626;
  transform: scale(1.1);
}

.dataset-card__content {
  padding: var(--spacing-md);
}

.dataset-card__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 var(--spacing-sm) 0;
  line-height: 1.3;
}

.dataset-card__description {
  color: var(--text-color-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.4;
  margin: 0 0 var(--spacing-md) 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dataset-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dataset-card__date {
  font-size: var(--font-size-xs);
  color: var(--text-color-muted);
}
</style>