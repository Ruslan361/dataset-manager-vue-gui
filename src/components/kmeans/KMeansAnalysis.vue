<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted } from 'vue' // Добавлен onMounted
import { imagesAPI } from '@/api/images'
import { kmeansAPI, type KMeansParameters as KMeansParams, type KMeansResult } from '@/api/kmeans'
import { useKMeansStore } from '@/stores/kmeans'

interface Props {
  selectedImageId: number | null
  datasetId: number
  selectedImageIds?: number[] // <-- optional array of selected image IDs
}

const props = defineProps<Props>()
const kmeansStore = useKMeansStore()

const updateKMeansParameters = (partial: Partial<KMeansParams>) => {
  kmeansStore.setParameters({ ...kmeansStore.getParameters, ...partial })
}

const getKMeansParameters = (): KMeansParams => ({
  ...kmeansStore.getParameters,
  colors: [...kmeansStore.getParameters.colors]
})

// Состояние анализа
const isProcessing = ref(false)
const isMassProcessing = ref(false)
const result = ref<KMeansResult | null>(null)
const error = ref<string | null>(null)

// Base64 изображения
const originalImageBase64 = ref<string | null>(null)
const resultImageBase64 = ref<string | null>(null)
const isLoadingOriginalImage = ref(false)
const isLoadingResultImage = ref(false)

// Состояния UI
const isParametersExpanded = ref(true)
const isOriginalImageCollapsed = ref(false)
const isResultImageCollapsed = ref(false)

// Polling
const pollingInterval = ref<number | null>(null)
const POLLING_DELAY = 2000

// --- Computed ---

const canAnalyze = computed(() => 
  props.selectedImageId !== null && !isProcessing.value
)

const hasResult = computed(() => 
  result.value !== null && result.value.status === 'completed'
)

const getOriginalImageUrl = computed(() => {
  return originalImageBase64.value || null
})

const getResultImageUrl = computed(() => {
  return resultImageBase64.value || null
})

// --- Watchers ---

// Сворачиваем параметры при успехе
watch(hasResult, (newHasResult) => {
  if (newHasResult) {
    isParametersExpanded.value = false
  }
})

// Реагируем на смену ID изображения
watch(() => props.selectedImageId, (newId) => {
  if (newId) {
    initData()
  } else {
    resetState()
  }
})

// --- Lifecycle ---

onMounted(() => {
  // Загружаем данные при монтировании компонента (переключение вкладок)
  if (props.selectedImageId) {
    initData()
  }
})

onUnmounted(() => {
  stopPolling()
})

// --- Methods ---

/**
 * Инициализация данных для текущего изображения
 * Объединяет сброс состояния и загрузку новых данных
 */
const initData = async () => {
  // 1. Сбрасываем старое состояние
  resetState()
  
  if (!props.selectedImageId) return

  // 2. Запускаем загрузку параллельно
  // Это решает проблему, когда результат есть, а оригинал не грузится
  await Promise.all([
    loadOriginalImage(),
    checkExistingResult()
  ])
}

const resetState = () => {
  result.value = null
  error.value = null
  originalImageBase64.value = null
  resultImageBase64.value = null
  isProcessing.value = false
  stopPolling()
}

/**
 * Загружаем оригинальное изображение в base64
 */
const loadOriginalImage = async () => {
  if (!props.selectedImageId) return
  
  try {
    isLoadingOriginalImage.value = true
    const base64 = await imagesAPI.getImageBase64(props.selectedImageId)
    originalImageBase64.value = base64
  } catch (err) {
    console.error('Error loading original image:', err)
    // Не блокируем UI ошибкой загрузки картинки, просто логируем
  } finally {
    isLoadingOriginalImage.value = false
  }
}

/**
 * Загружаем результирующее изображение в base64
 */
const loadResultImage = async () => {
  if (!props.selectedImageId) return
  
  try {
    isLoadingResultImage.value = true
    const base64 = await kmeansAPI.getResultImageBase64(
      props.selectedImageId,
      result.value?.result_id
    )
    if (base64) {
      resultImageBase64.value = base64
    }
  } catch (err) {
    console.error('Error loading result image:', err)
  } finally {
    isLoadingResultImage.value = false
  }
}

/**
 * Проверяем существующий результат
 */
const checkExistingResult = async () => {
  if (!props.selectedImageId) return
  
  try {
    const existingResult = await kmeansAPI.getResult(props.selectedImageId)
    
    if (existingResult) {
      result.value = existingResult
      
      // Восстанавливаем параметры из результата для UI
      if (existingResult.result) {
        if (existingResult.result.nclusters) {
          updateKMeansParameters({ nclusters: existingResult.result.nclusters })
        }
        // Восстанавливаем другие параметры по желанию...
      }
      
      if (existingResult.status === 'completed') {
        if (existingResult.has_result_image) {
          await loadResultImage()
        }
      } else if (existingResult.status === 'processing') {
        isProcessing.value = true
        startPolling()
      } else if (existingResult.status === 'failed') {
        error.value = `Предыдущий анализ завершился с ошибкой: ${existingResult.error || 'Неизвестная ошибка'}`
      }
    }
  } catch (err) {
    console.debug('No existing result or check failed', err)
  }
}

// ... Остальные методы (startPolling, stopPolling, runKMeansAnalysis и т.д.) остаются без изменений ...
// ... Не забудьте функцию getCentroidColor из предыдущего ответа ...

const startPolling = () => {
  if (pollingInterval.value) return
  
  pollingInterval.value = setInterval(async () => {
    if (!props.selectedImageId) {
      stopPolling()
      return
    }
    
    try {
      const pollingResult = await kmeansAPI.getResult(props.selectedImageId)
      
      if (pollingResult) {
        result.value = pollingResult
        
        if (pollingResult.status === 'completed') {
          isProcessing.value = false
          stopPolling()
          if (pollingResult.has_result_image) {
            await loadResultImage()
          }
        } else if (pollingResult.status === 'failed') {
          isProcessing.value = false
          stopPolling()
          error.value = `Ошибка анализа: ${pollingResult.error || 'Неизвестная ошибка'}`
        }
      }
    } catch (err) {
      // Игнорируем ошибки сети при поллинге, чтобы не пугать юзера, если моргнул инет
      console.warn('Polling check failed', err)
    }
  }, POLLING_DELAY)
}

const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

const runKMeansAnalysis = async () => {
  if (!props.selectedImageId) return
  
  try {
    isProcessing.value = true
    error.value = null
    result.value = null
    resultImageBase64.value = null
    
    const parameters = getKMeansParameters()
    
    const validationErrors = kmeansAPI.validateParameters(parameters)
    if (validationErrors.length > 0) {
      throw new Error(`Ошибки в параметрах:\n${validationErrors.join('\n')}`)
    }
    
    const response = await kmeansAPI.runAnalysis(props.selectedImageId, parameters)
    
    // Временная заглушка для мгновенного отклика UI
    // @ts-ignore
    result.value = {
      image_id: response.image_id,
      result_id: response.result_id,
      status: response.status,
      result: {}
    }
    
    startPolling()
    
  } catch (err) {
    const errorMessage = kmeansAPI.formatError(err)
    error.value = `Ошибка при запуске: ${errorMessage}`
    isProcessing.value = false
  }
}

const runKMeansForSelectedImages = async () => {
  const ids = props.selectedImageIds || []
  if (ids.length === 0) {
    error.value = 'Нет выбранных изображений для массового запуска'
    return
  }
  if (isProcessing.value || isMassProcessing.value) return
  if (!confirm(`Запустить кластеризацию для ${ids.length} выбранных изображений?`)) return

  try {
    isMassProcessing.value = true
    error.value = null

    const parameters = getKMeansParameters()

    const validationErrors = kmeansAPI.validateParameters(parameters)
    if (validationErrors.length > 0) {
      throw new Error(`Ошибки в параметрах:\n${validationErrors.join('\n')}`)
    }

    let started = 0
    for (const imageId of ids) {
      try {
        await kmeansAPI.runAnalysis(imageId, parameters)
        started++
      } catch (err) {
        console.warn(`Failed to start analysis for image ${imageId}`, err)
      }
    }

    error.value = `Запущено анализов: ${started} из ${ids.length}`
  } catch (err) {
    const errorMessage = kmeansAPI.formatError(err)
    error.value = `Ошибка массового запуска: ${errorMessage}`
  } finally {
    isMassProcessing.value = false
  }
}

const resetAnalysis = () => {
  resetState()
}

const loadDefaultParameters = () => {
  const defaultParams = kmeansAPI.getDefaultParameters(kmeansStore.getParameters.nclusters)
  kmeansStore.setParameters(defaultParams)
}

const dismissError = () => {
  error.value = null
}

const getCentroidColor = (index: number): string => {
  if (!result.value || !result.value.result) return 'transparent'


  const colors = result.value.result.colors
  if (!colors || !colors[index]) return 'transparent'
  const [r, g, b] = colors[index]
  return `rgb(${r}, ${g}, ${b})`
}
</script>

<template>
  <div class="kmeans-analysis">
    <!-- Информация о выбранном изображении -->
    <div class="analysis-info">
      <div class="info-header">
        <h4 class="section-title">Кластеризация</h4>
        <div style="display:flex; gap:8px; align-items:center;">
          <!-- Запуск для одного выбранного изображения -->
          <button
            v-if="selectedImageId"
            @click="runKMeansAnalysis"
            class="reset-params-btn"
            :disabled="isProcessing"
            title="Запустить кластеризацию для выбранного изображения"
          >
            ▶️ Запустить выбранное
          </button>

          <!-- Массовый запуск для выбранных в роуте изображений -->
          <button
            v-if="selectedImageIds && selectedImageIds.length"
            @click="runKMeansForSelectedImages"
            class="reset-params-btn"
            :disabled="isMassProcessing || isProcessing"
            title="Запустить кластеризацию для выбранных изображений"
          >
            ▶️ Запустить для выбранных ({{ selectedImageIds.length }})
          </button>
        </div>
      </div>
      
      <div v-if="selectedImageId" class="selected-image-info">
        <span class="info-label">Выбранное изображение:</span>
        <span class="info-value">ID {{ selectedImageId }}</span>
      </div>
      <div v-else class="no-selection">
        Выберите изображение для анализа
      </div>
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="isProcessing" class="processing-indicator">
      <div class="processing-spinner"></div>
      <div class="processing-text">
        Выполняется кластеризация...
        <br>
        <small>Это может занять некоторое время</small>
      </div>
    </div>

    <!-- Сообщение об ошибке -->
    <div v-if="error" class="error-message">
      <div class="error-content">
        <span class="error-icon">❌</span>
        <div class="error-text">{{ error }}</div>
        <button @click="dismissError" class="error-close">✕</button>
      </div>
    </div>

    <!-- Результаты анализа (ТОЛЬКО ЕСЛИ ГОТОВЫ) -->
    <!-- Изменено: v-if="result" -> v-if="hasResult" чтобы избежать ошибок доступа к undefined полям -->
    <div v-if="hasResult && result" class="results-section">
      <h5 class="results-title">Результаты анализа</h5>
      
      <!-- Статистика -->
      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-label">Кластеров:</span>
          <span class="stat-value">{{ result.result.nclusters }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Компактность:</span>
          <span class="stat-value">{{ result.result.compactness?.toFixed(2) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Критерий:</span>
          <span class="stat-value">{{ result.result.criteria }}</span>
        </div>
      </div>

      <!-- Центроиды -->
       <div class="centroids-section">
        <h6 class="centroids-title">Центроиды кластеров:</h6>
        <div class="centroids-list">
          <div
            v-for="(centroid, index) in (result.result.centers_sorted || [])"
            :key="index"
            class="centroid-item"
          >
            <!-- ИСПРАВЛЕНО: Используем функцию вместо сложной логики в шаблоне -->
            <div
              class="centroid-color"
              :style="{ 
                backgroundColor: getCentroidColor(index)
              }"
            ></div>
            <div class="centroid-info">
              <div class="centroid-name">Кластер {{ index + 1 }}</div>
              <div class="centroid-value">среднее значение: {{ centroid.toFixed(2) }} (у.е.)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Сравнение изображений -->
      <div class="images-comparison">
        <!-- Оригинальное изображение -->
        <div class="image-section">
          <div 
            class="image-header" 
            @click="isOriginalImageCollapsed = !isOriginalImageCollapsed"
          >
            <h6 class="image-title">Оригинальное изображение</h6>
            <span class="image-toggle">
              {{ isOriginalImageCollapsed ? '▼' : '▲' }}
            </span>
          </div>
          <div v-show="!isOriginalImageCollapsed" class="image-container">
            <div v-if="isLoadingOriginalImage" class="image-loading">
              <div class="loading-spinner"></div>
            </div>
            <img
              v-else-if="getOriginalImageUrl"
              :src="getOriginalImageUrl"
              alt="Оригинальное изображение"
              class="analysis-image"
            />
            <div v-else class="image-placeholder">
              Изображение не загружено
            </div>
          </div>
        </div>

        <!-- Результирующее изображение -->
        <div class="image-section">
          <div 
            class="image-header" 
            @click="isResultImageCollapsed = !isResultImageCollapsed"
          >
            <h6 class="image-title">Результат кластеризации</h6>
            <span class="image-toggle">
              {{ isResultImageCollapsed ? '▼' : '▲' }}
            </span>
          </div>
          <div v-show="!isResultImageCollapsed" class="image-container result-container">
            <div v-if="isLoadingResultImage" class="image-loading">
              <div class="loading-spinner"></div>
            </div>
            <img
              v-else-if="getResultImageUrl"
              :src="getResultImageUrl"
              alt="Результат кластеризации"
              class="analysis-image result-image"
            />
            <div v-else class="image-placeholder">
              Результат не готов
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Стили остаются без изменений */
.kmeans-analysis {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  height: 100%;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.analysis-info {
  background-color: var(--bg-color-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.section-title {
  margin: 0;
  color: var(--primary-color);
}

.selected-image-info {
  font-size: 0.9em;
  color: var(--text-color-secondary);
}

.reset-params-btn {
  background: none;
  border: 1px solid var(--border-color);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  transition: all 0.2s;
}

.reset-params-btn:hover:not(:disabled) {
  background-color: var(--bg-color-hover);
  border-color: var(--primary-color);
}

.processing-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  background-color: var(--bg-color-primary);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  gap: var(--spacing-md);
}

.processing-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-color-accent);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.processing-text {
  text-align: center;
  color: var(--text-color-secondary);
}

.error-message {
  background-color: var(--error-bg);
  border: 1px solid var(--error-border);
  color: var(--error-text);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.error-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 1.2em;
  padding: 0;
}

.results-section {
  background-color: var(--bg-color-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.results-title {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  color: var(--text-color-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--spacing-sm);
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.8em;
  color: var(--text-color-secondary);
}

.stat-value {
  font-weight: 500;
  color: var(--text-color-primary);
}

.centroids-section {
  margin-bottom: var(--spacing-lg);
}

.centroids-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 0.9em;
  color: var(--text-color-secondary);
}

.centroids-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.centroid-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  background-color: var(--bg-color-accent);
  border-radius: var(--border-radius);
}

.centroid-color {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.1);
}

.centroid-info {
  display: flex;
  flex-direction: column;
}

.centroid-name {
  font-weight: 500;
  font-size: 0.9em;
}

.centroid-value {
  font-size: 0.8em;
  color: var(--text-color-secondary);
}

.images-comparison {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.image-section {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.image-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-color-accent);
  cursor: pointer;
  user-select: none;
}

.image-title {
  margin: 0;
  font-size: 0.9em;
  font-weight: 500;
}

.image-container {
  padding: var(--spacing-md);
  display: flex;
  justify-content: center;
  background-color: var(--bg-color-secondary);
}


.image-container.result-container {
  background-color: #000;
}
  
.analysis-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.result-image {
  background-color: #000;
  display: block;
}
  
.image-loading, .image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text-color-secondary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-sm);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>