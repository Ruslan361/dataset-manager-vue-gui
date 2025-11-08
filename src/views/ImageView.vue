<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import ImageCard from '@/components/ImageCard.vue'
import Button from '@/components/Button.vue'
import MarkupDropdown from '@/components/MarkupDropdown.vue'
import Pagination from '@/components/Pagination.vue'
import ImageUploadModal from '@/components/ImageUploadModal.vue'
import MarkupImporter from '@/components/MarkupImporter.vue' // Импортируем новый компонент
import { imagesAPI, type Image } from '@/api/images'

const route = useRoute()
const router = useRouter()

// Состояние компонента
const images = ref<Image[]>([])
const selectedImages = ref<Set<number>>(new Set())
const isLoading = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const totalImages = ref(0)
const itemsPerPage = 20
const showUploadModal = ref(false)

// Ссылки на компоненты
const uploadModalRef = ref<InstanceType<typeof ImageUploadModal>>()

// ID датасета из маршрута
const datasetId = computed(() => parseInt(route.params.id as string))

// Улучшенная функция загрузки с лучшей обработкой ошибок
const loadImages = async (page: number = 1) => {
  try {
    isLoading.value = true
    error.value = null
    
    const start = (page - 1) * itemsPerPage
    const end = start + itemsPerPage
    
    console.log(`Loading images for page ${page} (${start}-${end})`)
    
    const response = await imagesAPI.getImagesList(datasetId.value, {
      start,
      end,
      sort_field: 'id',
      sort_order: 'desc'
    })
    
    images.value = response.images
    totalImages.value = response.total || response.images.length
    currentPage.value = page
    
    console.log(`Loaded ${response.images.length} images, total: ${totalImages.value}`)
    
    // Если текущая страница пуста и это не первая страница, переходим на предыдущую
    if (response.images.length === 0 && page > 1) {
      console.log('Current page is empty, going to previous page')
      await loadImages(page - 1)
      return
    }
    
  } catch (err) {
    error.value = 'Ошибка при загрузке изображений'
    console.error('Error loading images:', err)
  } finally {
    isLoading.value = false
  }
}

// Обработчики событий
const handleImageClick = (imageId: number) => {
  console.log('Открыть изображение:', imageId)
  // Здесь будет логика открытия изображения в модальном окне
}

const handleImageSelect = (imageId: number, selected: boolean) => {
  console.log(`Image ${imageId} selection changed to: ${selected}`)
  
  if (selected) {
    selectedImages.value.add(imageId)
  } else {
    selectedImages.value.delete(imageId)
  }
  
  // Если используете reactive Set, может потребоваться принудительное обновление
  selectedImages.value = new Set(selectedImages.value)
}

const handleImageDelete = async (imageId: number) => {
  if (!confirm('Вы уверены, что хотите удалить это изображение?')) {
    return
  }
  
  try {
    const result = await imagesAPI.removeImage(imageId)
    if (result.success) {
      // Удаляем из выбранных
      selectedImages.value.delete(imageId)
      
      // Перезагружаем текущую страницу
      await loadImages(currentPage.value)
      
      console.log(`Image ${imageId} deleted and page reloaded`)
    } else {
      error.value = result.message || 'Ошибка при удалении изображения'
    }
  } catch (err) {
    error.value = 'Ошибка при удалении изображения'
    console.error('Error deleting image:', err)
  }
}

const handleSelectAll = () => {
  if (selectedImages.value.size === images.value.length) {
    selectedImages.value.clear()
  } else {
    images.value.forEach(image => selectedImages.value.add(image.id))
  }
}

const handleDeleteSelected = async () => {
  if (selectedImages.value.size === 0) return
  
  const selectedCount = selectedImages.value.size
  
  if (!confirm(`Вы уверены, что хотите удалить ${selectedCount} изображений?`)) {
    return
  }
  
  try {
    console.log(`Starting deletion of ${selectedCount} images...`)
    
    // Показываем индикатор загрузки
    isLoading.value = true
    
    const deletePromises = Array.from(selectedImages.value).map(id => 
      imagesAPI.removeImage(id)
    )
    
    const results = await Promise.all(deletePromises)
    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount
    
    console.log(`Deletion completed: ${successCount} success, ${failCount} failed`)
    
    // Очищаем выбранные изображения
    selectedImages.value.clear()
    
    // Всегда перезагружаем страницу после попытки удаления
    await loadImages(currentPage.value)
    
    // Показываем результат
    if (failCount === 0) {
      console.log(`All ${successCount} images deleted successfully`)
    } else {
      error.value = `Удалено ${successCount} из ${results.length} изображений. ${failCount} не удалось удалить.`
      
      // Показываем детали ошибок в консоли
      const failedResults = results.filter(r => !r.success)
      console.error('Failed deletions:', failedResults)
    }
  } catch (err) {
    error.value = 'Ошибка при массовом удалении изображений'
    console.error('Error deleting selected images:', err)
    
    // Все равно перезагружаем страницу на случай частичного успеха
    await loadImages(currentPage.value)
    selectedImages.value.clear()
  } finally {
    isLoading.value = false
  }
}

const handleManualMarkup = () => {
  if (selectedImages.value.size === 0) {
    alert('Выберите изображения для разметки')
    return
  }
  console.log('Ручная разметка для:', Array.from(selectedImages.value))
  // Здесь будет переход к ручной разметке
}

const handleKMeansMarkup = () => {
  if (selectedImages.value.size === 0) {
    alert('Выберите изображения для разметки')
    return
  }
  console.log('K-Means разметка для:', Array.from(selectedImages.value))
  // Здесь будет логика K-Means разметки
}

const handlePageChange = (page: number) => {
  loadImages(page)
  selectedImages.value.clear()
}

const goBack = () => {
  router.push('/')
}

// Метод для принудительной очистки кэша
const clearCache = () => {
  imagesAPI.clearAllCache()
  console.log('Cache cleared')
}

// Обработчики загрузки изображений
const openUploadModal = () => {
  showUploadModal.value = true
}

const closeUploadModal = () => {
  showUploadModal.value = false
}

// Исправленный обработчик загрузки - использует имена файлов как titles
const handleImageUpload = async (files: FileList) => {
  try {
    console.log(`Starting upload of ${files.length} files to dataset ${datasetId.value}`)
    
    // Показываем индикатор загрузки в модальном окне
    uploadModalRef.value?.setLoading(true)
    
    // Преобразуем FileList в массив и загружаем каждый файл с его именем как title
    const uploadPromises = Array.from(files).map(file => {
      // Используем имя файла без расширения как title
      const title = file.name.replace(/\.[^/.]+$/, "") // Удаляем расширение
      
      console.log(`Uploading file: ${file.name} with title: ${title}`)
      
      return imagesAPI.uploadImage(datasetId.value, file, title)
    })
    
    const results = await Promise.all(uploadPromises)
    
    console.log('Upload results:', results)
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount
    
    if (successCount > 0) {
      // Перезагружаем список изображений
      console.log(`Successfully uploaded ${successCount} images, reloading list...`)
      await loadImages(1)
      currentPage.value = 1
      selectedImages.value.clear()
    }
    
    if (failCount === 0) {
      // Все файлы загружены успешно
      console.log('All files uploaded successfully')
      closeUploadModal()
    } else {
      // Есть ошибки при загрузке
      const failedResults = results.filter(r => !r.success)
      const errorMessage = `Загружено ${successCount} из ${results.length} файлов.\n\nОшибки:\n${failedResults.map(r => `• ${r.message}`).join('\n')}`
      console.error('Some uploads failed:', failedResults)
      uploadModalRef.value?.setError(errorMessage)
    }
  } catch (err) {
    const errorMessage = 'Ошибка при загрузке файлов'
    console.error('Upload error:', err)
    uploadModalRef.value?.setError(errorMessage)
  } finally {
    uploadModalRef.value?.setLoading(false)
  }
}

// Дополнительная функция для принудительного обновления
const forceRefresh = async () => {
  console.log('Force refreshing images...')
  selectedImages.value.clear()
  await loadImages(currentPage.value)
}

// НОВЫЙ обработчик для события от импортера
const handleImportCompleted = () => {
  console.log('Import completed, refreshing image list...')
  forceRefresh()
}

// Загружаем данные при монтировании
onMounted(() => {
  loadImages()
})
</script>

<template>
  <div class="main-layout">
    <Header />
    
    <main class="main-content">
      <div class="container">
        <div class="dataset-header">
          <Button 
            variant="secondary"
            size="medium"
            @click="goBack"
          >
            ← Назад к датасетам
          </Button>
          <h2 class="page-title">Изображения датасета #{{ datasetId }}</h2>
          
          <div class="header-actions">
            <!-- ДОБАВЛЕНО: Компонент импорта -->
            <MarkupImporter :dataset-id="datasetId" @import-completed="handleImportCompleted" />

            <Button 
              variant="primary"
              size="medium"
              @click="openUploadModal"
              :disabled="isLoading"
            >
              📤 Загрузить изображения
            </Button>
            
            <Button 
              variant="secondary"
              size="small"
              @click="clearCache"
              title="Очистить кэш изображений"
            >
              🗑️ Очистить кэш
            </Button>
            
            <!-- Кнопка принудительного обновления -->
            <Button 
              variant="secondary"
              size="small"
              @click="forceRefresh"
              :disabled="isLoading"
              title="Обновить список изображений"
            >
              🔄 Обновить
            </Button>
          </div>
        </div>

        <!-- Панель управления -->
        <div class="control-panel">
          <div class="control-panel__selection">
            <Button 
              variant="secondary"
              size="small"
              @click="handleSelectAll"
              :disabled="images.length === 0 || isLoading"
            >
              {{ selectedImages.size === images.length && images.length > 0 ? 'Снять выделение' : 'Выбрать все' }}
            </Button>
            
            <span v-if="selectedImages.size > 0" class="selection-count">
              Выбрано: {{ selectedImages.size }}
            </span>
          </div>
          
          <div class="control-panel__actions">
            <Button 
              variant="error"
              size="medium"
              @click="handleDeleteSelected"
              :disabled="selectedImages.size === 0 || isLoading"
            >
              {{ isLoading ? 'Удаление...' : 'Удалить выбранные' }}
            </Button>
            
            <MarkupDropdown
              :disabled="selectedImages.size === 0 || isLoading"
              :selected-images="selectedImages"
              :dataset-id="datasetId"
              @manual-markup="handleManualMarkup"
              @k-means-markup="handleKMeansMarkup"
            />
          </div>
        </div>

        <!-- Сообщение об ошибке -->
        <div v-if="error" class="error-message">
          {{ error }}
          <Button 
            variant="secondary" 
            size="small"
            @click="() => { error = null; forceRefresh(); }"
          >
            Повторить
          </Button>
        </div>

        <!-- Индикатор загрузки -->
        <div v-if="isLoading" class="loading">
          <div class="loading-spinner"></div>
          <span>{{ selectedImages.size > 0 ? 'Удаление изображений...' : 'Загрузка изображений...' }}</span>
        </div>

        <!-- Сетка изображений -->
        <div v-else-if="images.length > 0" class="images-grid">
          <ImageCard
            v-for="image in images"
            :key="image.id"
            :id="image.id"
            :filename="image.filename"
            :original-filename="image.original_filename"
            :is-selected="selectedImages.has(image.id)"
            @click="handleImageClick"
            @select="handleImageSelect"
            @delete="handleImageDelete"
          />
        </div>

        <!-- Пустое состояние -->
        <div v-else-if="!isLoading" class="empty-state">
          <div class="empty-state__icon">📷</div>
          <h3>В датасете нет изображений</h3>
          <p>Загрузите изображения, чтобы начать работу с разметкой</p>
          <Button 
            variant="primary" 
            size="medium"
            @click="openUploadModal"
          >
            📤 Загрузить первые изображения
          </Button>
        </div>

        <!-- Пагинация -->
        <Pagination
          v-if="totalImages > itemsPerPage"
          :current-page="currentPage"
          :total-items="totalImages"
          :items-per-page="itemsPerPage"
          @page-change="handlePageChange"
        />
      </div>
    </main>

    <!-- Модальное окно загрузки -->
    <ImageUploadModal
      ref="uploadModalRef"
      :is-visible="showUploadModal"
      :dataset-id="datasetId"
      @close="closeUploadModal"
      @upload="handleImageUpload"
    />
  </div>
</template>

<!-- Стили остаются без изменений -->
<style scoped>
.main-layout {
  min-height: 100vh;
  background-color: var(--bg-color-secondary);
}

.main-content {
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.dataset-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm); /* Уменьшим отступ для большего кол-ва кнопок */
  align-items: center;
}

.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-lg);
}

.control-panel__selection {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.selection-count {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  font-weight: 500;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--primary-color);
  color: white;
  border-radius: var(--border-radius);
}

.control-panel__actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.error-message {
  background-color: var(--error-color);
  color: white;
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-sm);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--text-color-secondary);
  font-size: var(--font-size-lg);
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  background-color: var(--bg-color);
  border-radius: var (--border-radius-large);
  border: 2px dashed var(--border-color);
  margin: var(--spacing-xl) 0;
}

.empty-state__icon {
  font-size: 64px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-state h3 {
  color: var(--text-color);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-xl);
}

.empty-state p {
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-base);
}

@media (max-width: 768px) {
  .dataset-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .control-panel {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .control-panel__actions {
    width: 100%;
    justify-content: center;
  }
  
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--spacing-md);
  }
  
  .empty-state {
    margin: var(--spacing-lg) 0;
  }
  
  .empty-state__icon {
    font-size: 48px;
  }
}
</style>