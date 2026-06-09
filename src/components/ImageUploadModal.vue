<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import Button from '@/components/common/Button.vue'

interface Props {
  isVisible: boolean
  datasetId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  upload: [files: FileList]
}>()

// Локальное состояние модального окна
const files = ref<FileList | null>(null)
const isLoading = ref(false)
const isDragOver = ref(false)
const uploadError = ref<string | null>(null)
const uploadProgress = ref(0)
const currentFileName = ref<string>('')

const fileInput = ref<HTMLInputElement>()

// Вычисляемые свойства
const selectedFilesCount = computed(() => files.value ? files.value.length : 0)
const isFormValid = computed(() => {
  return selectedFilesCount.value > 0 && !uploadError.value
})

// Сбрасываем форму при открытии/закрытии модального окна
watch(() => props.isVisible, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  files.value = target.files
  validateFiles()
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  // Проверяем, что мы действительно покидаем drop-zone
  const dropZone = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as HTMLElement
  
  if (!dropZone.contains(relatedTarget)) {
    isDragOver.value = false
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const droppedFiles = event.dataTransfer?.files
  if (droppedFiles && droppedFiles.length > 0) {
    // Фильтруем только изображения
    const imageFiles = Array.from(droppedFiles).filter(file => 
      file.type.startsWith('image/')
    )
    
    if (imageFiles.length > 0) {
      const dt = new DataTransfer()
      imageFiles.forEach(file => dt.items.add(file))
      
      files.value = dt.files
      if (fileInput.value) {
        fileInput.value.files = dt.files
      }
    }
    
    validateFiles()
  }
}

const validateFiles = async () => {
  uploadError.value = null
  
  if (!files.value || files.value.length === 0) {
    return
  }
  
  // Простая валидация без импорта API
  const maxFileSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
  
  for (const file of Array.from(files.value)) {
    if (file.size > maxFileSize) {
      uploadError.value = `Файл "${file.name}" превышает максимальный размер 10MB`
      return
    }
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      uploadError.value = `Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются: JPEG, PNG, GIF, WebP`
      return
    }
  }
}

const openFileDialog = () => {
  if (!isLoading.value) {
    fileInput.value?.click()
  }
}

const removeFile = (index: number) => {
  if (files.value && !isLoading.value) {
    const dt = new DataTransfer()
    const fileList = Array.from(files.value)
    
    fileList.forEach((file, i) => {
      if (i !== index) {
        dt.items.add(file)
      }
    })
    
    files.value = dt.files.length > 0 ? dt.files : null
    if (fileInput.value) {
      fileInput.value.files = dt.files
    }
    validateFiles()
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value || isLoading.value) {
    return
  }
  
  try {
    isLoading.value = true
    uploadError.value = null
    uploadProgress.value = 0
    
    emit('upload', files.value!)
  } catch (error) {
    uploadError.value = 'Произошла ошибка при подготовке загрузки'
    isLoading.value = false
  }
}

const handleClose = () => {
  if (!isLoading.value) {
    emit('close')
  }
}

const resetForm = () => {
  files.value = null
  isLoading.value = false
  uploadError.value = null
  uploadProgress.value = 0
  currentFileName.value = ''
  revokePreviewUrls()
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getTotalSize = (): string => {
  if (!files.value) return '0 Bytes'
  
  const totalBytes = Array.from(files.value).reduce((sum, file) => sum + file.size, 0)
  return formatFileSize(totalBytes)
}

const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/')
}

const previewUrls = new Map<string, string>()

const getPreviewUrl = (file: File): string => {
  const key = `${file.name}-${file.size}`
  if (!previewUrls.has(key)) {
    previewUrls.set(key, URL.createObjectURL(file))
  }
  return previewUrls.get(key)!
}

const revokePreviewUrls = () => {
  previewUrls.forEach(url => URL.revokeObjectURL(url))
  previewUrls.clear()
}

onUnmounted(revokePreviewUrls)

const getFileDisplayName = (file: File): string => {
  // Убираем расширение из имени файла для отображения
  return file.name.replace(/\.[^/.]+$/, '')
}

// Публичные методы для внешнего управления
const setLoading = (loading: boolean) => {
  isLoading.value = loading
}

const setError = (error: string | null) => {
  uploadError.value = error
  isLoading.value = false
}

const setProgress = (progress: number, fileName?: string) => {
  uploadProgress.value = Math.max(0, Math.min(100, progress))
  if (fileName) {
    currentFileName.value = fileName
  }
}

// Экспортируем методы для родительского компонента
defineExpose({
  setLoading,
  setError,
  setProgress,
  resetForm
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" class="modal-overlay" @click="handleClose">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Загрузить изображения в датасет #{{ datasetId }}</h3>
          <button 
            class="close-button" 
            @click="handleClose"
            :disabled="isLoading"
            title="Закрыть"
          >
            &times;
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="modal-form">
          <!-- Зона перетаскивания -->
          <div 
            class="drop-zone"
            :class="{
              'drop-zone--active': isDragOver,
              'drop-zone--has-files': files && files.length > 0,
              'drop-zone--error': uploadError,
              'drop-zone--loading': isLoading
            }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            @click="openFileDialog"
          >
            <input 
              ref="fileInput"
              type="file"
              multiple
              accept="image/*"
              @change="handleFileSelect"
              class="file-input"
              :disabled="isLoading"
            >
            
            <div v-if="!files || files.length === 0" class="drop-zone__content">
              <div class="drop-zone__icon">📁</div>
              <p class="drop-zone__text">
                Перетащите изображения сюда или нажмите для выбора
              </p>
              <p class="drop-zone__hint">
                Поддерживаются форматы: JPG, PNG, GIF, WebP (до 10MB каждый)
              </p>
              <p class="drop-zone__note">
                💡 Названия изображений будут взяты из имен файлов
              </p>
            </div>
            
            <!-- Превью выбранных файлов -->
            <div v-else class="files-preview">
              <div class="files-summary">
                <h4>Выбрано файлов: {{ selectedFilesCount }}</h4>
                <p class="total-size">Общий размер: {{ getTotalSize() }}</p>
              </div>
              
              <div class="files-grid">
                <div 
                  v-for="(file, index) in Array.from(files)"
                  :key="`${file.name}-${file.size}-${index}`"
                  class="file-item"
                >
                  <div class="file-preview">
                    <img 
                      v-if="isImageFile(file)"
                      :src="getPreviewUrl(file)"
                      :alt="file.name"
                      class="file-image"
                    >
                    <div v-else class="file-placeholder">
                      📄
                    </div>
                  </div>
                  
                  <div class="file-info">
                    <p class="file-display-name" :title="getFileDisplayName(file)">
                      {{ getFileDisplayName(file) }}
                    </p>
                    <p class="file-original-name" :title="file.name">{{ file.name }}</p>
                    <p class="file-size">{{ formatFileSize(file.size) }}</p>
                  </div>
                  
                  <button 
                    type="button"
                    class="file-remove"
                    @click.stop="removeFile(index)"
                    :disabled="isLoading"
                    title="Удалить файл"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <button 
                type="button"
                class="add-more-button"
                @click.stop="openFileDialog"
                :disabled="isLoading"
              >
                + Добавить еще файлы
              </button>
            </div>
          </div>
          
          <!-- Прогресс загрузки -->
          <div v-if="isLoading" class="upload-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: uploadProgress + '%' }"
              ></div>
            </div>
            <div class="progress-info">
              <span>{{ uploadProgress }}%</span>
              <span v-if="currentFileName" class="current-file">
                Загружается: {{ currentFileName }}
              </span>
            </div>
          </div>
          
          <!-- Ошибки валидации -->
          <div v-if="uploadError" class="upload-error">
            <strong>Ошибка:</strong> {{ uploadError }}
          </div>
          
          <!-- Информация о загрузке -->
          <div v-if="files && files.length > 0 && !isLoading" class="upload-info">
            <div class="upload-info__item">
              <strong>Файлов к загрузке:</strong> {{ selectedFilesCount }}
            </div>
            <div class="upload-info__item">
              <strong>Общий размер:</strong> {{ getTotalSize() }}
            </div>
            <div class="upload-info__note">
              💡 Названия изображений будут взяты из имен файлов (без расширения)
            </div>
          </div>
          
          <div class="form-actions">
            <Button 
              type="button"
              variant="secondary"
              size="medium"
              @click="handleClose"
              :disabled="isLoading"
            >
              Отмена
            </Button>
            
            <Button 
              type="submit" 
              variant="primary"
              size="medium"
              :disabled="!isFormValid || isLoading"
            >
              <span v-if="isLoading">
                Загрузка... ({{ uploadProgress }}%)
              </span>
              <span v-else>
                Загрузить {{ selectedFilesCount > 0 ? `(${selectedFilesCount})` : '' }}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background-color: var(--bg-color);
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-lg);
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-color-secondary);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var (--border-radius);
  transition: var(--transition-base);
}

.close-button:hover:not(:disabled) {
  background-color: var(--bg-color-accent);
  color: var(--text-color);
}

.close-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-form {
  padding: var(--spacing-lg);
}

.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: var(--transition-base);
  margin-bottom: var(--spacing-lg);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color-secondary);
}

.drop-zone:hover:not(.drop-zone--error),
.drop-zone--active {
  border-color: var(--primary-color);
  background-color: rgba(59, 130, 246, 0.05);
}

.drop-zone--error {
  border-color: var(--error-color);
  background-color: rgba(239, 68, 68, 0.05);
}

.drop-zone--has-files {
  padding: var(--spacing-md);
  min-height: auto;
}

.drop-zone--loading {
  pointer-events: none;
  opacity: 0.8;
}

.file-input {
  display: none;
}

.drop-zone__content {
  pointer-events: none;
}

.drop-zone__icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
  opacity: 0.7;
}

.drop-zone__text {
  font-size: var(--font-size-lg);
  color: var(--text-color);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 500;
}

.drop-zone__hint {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  margin: 0 0 var(--spacing-xs) 0;
}

.drop-zone__note {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
  margin: 0;
  font-style: italic;
}

.files-preview {
  width: 100%;
}

.files-summary {
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var (--border-color);
  margin-bottom: var(--spacing-md);
}

.files-summary h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-color);
  font-size: var(--font-size-base);
}

.total-size {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
}

.files-grid {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: var(--spacing-md);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-sm);
  background-color: var(--bg-color);
  transition: var(--transition-base);
}

.file-item:hover {
  box-shadow: var(--shadow-sm);
}

.file-preview {
  width: 60px;
  height: 60px;
  border-radius: var(--border-radius);
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color-accent);
}

.file-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-placeholder {
  font-size: 24px;
  opacity: 0.5;
}

.file-info {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.file-display-name {
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 600;
  color: var(--text-color);
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.file-original-name {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.8;
}

.file-size {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
}

.file-remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--error-color);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  transition: var(--transition-base);
  flex-shrink: 0;
}

.file-remove:hover:not(:disabled) {
  background-color: var(--error-color-dark);
  transform: scale(1.1);
}

.file-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.add-more-button {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  background: var(--bg-color-secondary);
  color: var(--primary-color);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: var(--transition-base);
}

.add-more-button:hover:not(:disabled) {
  border-color: var(--primary-color);
  background-color: rgba(59, 130, 246, 0.05);
}

.add-more-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-progress {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--bg-color-secondary);
  border-radius: var(--border-radius);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
}

.current-file {
  color: var(--text-color-secondary);
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-sm);
  border-left: 3px solid var(--error-color);
}

.upload-info {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.upload-info__item {
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-color);
}

.upload-info__note {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: var(--spacing-md);
  }
  
  .modal-header {
    padding: var(--spacing-md);
  }
  
  .modal-form {
    padding: var(--spacing-md);
  }
  
  .drop-zone {
    padding: var(--spacing-lg);
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .file-item {
    gap: var(--spacing-sm);
  }
  
  .file-preview {
    width: 50px;
    height: 50px;
  }
}
</style>