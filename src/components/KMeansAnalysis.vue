<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import KMeansParameters from '@/components/KMeansParameters.vue'
import { imagesAPI } from '@/api/images'
import { kmeansAPI, type KMeansParameters as KMeansParams, type KMeansResult } from '@/api/kmeans'

interface Props {
  selectedImageId: number | null
  datasetId: number
}

const props = defineProps<Props>()

// Состояние анализа
const isProcessing = ref(false)
const result = ref<KMeansResult | null>(null)
const error = ref<string | null>(null)

// Base64 изображения
const originalImageBase64 = ref<string | null>(null)
const resultImageBase64 = ref<string | null>(null)
const isLoadingOriginalImage = ref(false)
const isLoadingResultImage = ref(false)

// Параметры анализа
const clusters = ref(3)
const maxIterations = ref(100)
const attempts = ref(5)
const criteria = ref('all')
const flags = ref('pp')
const epsilon = ref(0.5)
const colors = ref<Array<[number, number, number]>>([
  [255, 0, 0],   // Красный
  [0, 255, 0],   // Зеленый
  [0, 0, 255]    // Синий
])

// Состояния UI
const isParametersExpanded = ref(true)
const isOriginalImageCollapsed = ref(false)
const isResultImageCollapsed = ref(false)

// Polling
const pollingInterval = ref<number | null>(null)
const POLLING_DELAY = 3000

// Вычисляемые свойства
const canAnalyze = computed(() => 
  props.selectedImageId !== null && !isProcessing.value
)

const hasResult = computed(() => result.value !== null)

const getOriginalImageUrl = computed(() => {
  return originalImageBase64.value || null
})

const getResultImageUrl = computed(() => {
  return resultImageBase64.value || null
})

// Автоматически сворачиваем/разворачиваем секции
watch(hasResult, (newHasResult) => {
  isParametersExpanded.value = !newHasResult
})

// Сброс результата при смене изображения
watch(() => props.selectedImageId, () => {
  result.value = null
  error.value = null
  originalImageBase64.value = null
  resultImageBase64.value = null
  stopPolling()
  
  if (props.selectedImageId) {
    loadOriginalImage()
    checkExistingResult()
  }
})

// Очищаем polling при размонтировании
onUnmounted(() => {
  stopPolling()
})

/**
 * Загружаем оригинальное изображение в base64
 */
const loadOriginalImage = async () => {
  if (!props.selectedImageId) return
  
  try {
    isLoadingOriginalImage.value = true
    const base64 = await imagesAPI.getImageBase64(props.selectedImageId)
    originalImageBase64.value = base64
    console.log(`Original image loaded for image ${props.selectedImageId}`)
  } catch (err) {
    console.error('Error loading original image:', err)
    error.value = 'Ошибка при загрузке оригинального изображения'
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
    const base64 = await kmeansAPI.getResultImageBase64(props.selectedImageId)
    if (base64) {
      resultImageBase64.value = base64
      console.log(`Result image loaded for image ${props.selectedImageId}`)
    }
  } catch (err) {
    console.error('Error loading result image:', err)
    // Не показываем ошибку, так как изображение может еще не быть готово
  } finally {
    isLoadingResultImage.value = false
  }
}

/**
 * Проверяем существующий результат для выбранного изображения
 */
const checkExistingResult = async () => {
  if (!props.selectedImageId) return
  
  try {
    const existingResult = await kmeansAPI.getResult(props.selectedImageId)
    if (existingResult) {
      result.value = existingResult
      console.log('Found existing K-Means result:', existingResult)
      
      // Загружаем результирующее изображение
      if (existingResult.has_result_image) {
        await loadResultImage()
      }
    }
  } catch (err) {
    console.log('No existing result found:', kmeansAPI.formatError(err))
  }
}

/**
 * Запускаем polling для проверки результата
 */
const startPolling = () => {
  if (pollingInterval.value) return
  
  pollingInterval.value = setInterval(async () => {
    if (!props.selectedImageId || !isProcessing.value) {
      stopPolling()
      return
    }
    
    try {
      const pollingResult = await kmeansAPI.getResult(props.selectedImageId)
      if (pollingResult) {
        result.value = pollingResult
        isProcessing.value = false
        stopPolling()
        console.log('K-Means analysis completed:', pollingResult)
        
        // Загружаем результирующее изображение
        if (pollingResult.has_result_image) {
          await loadResultImage()
        }
      }
    } catch (err) {
      // Результат еще не готов или произошла ошибка
      const errorMessage = kmeansAPI.formatError(err)
      if (!errorMessage.includes('не найден')) {
        // Если это не 404 (результат не готов), то это серьезная ошибка
        console.error('Polling error:', errorMessage)
        error.value = `Ошибка при проверке результата: ${errorMessage}`
        isProcessing.value = false
        stopPolling()
      }
    }
  }, POLLING_DELAY)
}

/**
 * Останавливаем polling
 */
const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

/**
 * Запуск K-Means анализа
 */
const runKMeansAnalysis = async () => {
  if (!props.selectedImageId) return
  
  try {
    isProcessing.value = true
    error.value = null
    result.value = null
    resultImageBase64.value = null
    
    // Подготавливаем параметры
    const parameters: KMeansParams = {
      nclusters: clusters.value,
      criteria: criteria.value,
      max_iterations: maxIterations.value,
      attempts: attempts.value,
      epsilon: epsilon.value,
      flags: flags.value,
      colors: colors.value
    }
    
    // Валидируем параметры
    const validationErrors = kmeansAPI.validateParameters(parameters)
    if (validationErrors.length > 0) {
      throw new Error(`Ошибки в параметрах:\n${validationErrors.join('\n')}`)
    }
    
    console.log(`Running K-Means analysis on image ${props.selectedImageId}`)
    
    // Запускаем анализ
    const response = await kmeansAPI.runAnalysis(props.selectedImageId, parameters)
    
    // Начинаем polling для проверки результата
    startPolling()
    
  } catch (err) {
    const errorMessage = kmeansAPI.formatError(err)
    error.value = `Ошибка при запуске K-Means анализа: ${errorMessage}`
    console.error('K-Means analysis error:', err)
    isProcessing.value = false
  }
}

/**
 * Сброс анализа и результатов
 */
const resetAnalysis = () => {
  stopPolling()
  result.value = null
  error.value = null
  resultImageBase64.value = null
  isProcessing.value = false
}

/**
 * Загрузка параметров по умолчанию
 */
const loadDefaultParameters = () => {
  const defaultParams = kmeansAPI.getDefaultParameters(clusters.value)
  
  maxIterations.value = defaultParams.max_iterations
  attempts.value = defaultParams.attempts
  criteria.value = defaultParams.criteria
  flags.value = defaultParams.flags
  epsilon.value = defaultParams.epsilon
  colors.value = defaultParams.colors
}

/**
 * Закрытие ошибки
 */
const dismissError = () => {
  error.value = null
}
</script>

<template>
  <div class="kmeans-analysis">
    <!-- Информация о выбранном изображении -->
    <div class="analysis-info">
      <div class="info-header">
        <h4 class="section-title">K-Means кластеризация</h4>
        <button 
          v-if="selectedImageId"
          @click="loadDefaultParameters"
          class="reset-params-btn"
          :disabled="isProcessing"
          title="Загрузить параметры по умолчанию"
        >
          🔄 По умолчанию
        </button>
      </div>
      
      <div v-if="selectedImageId" class="selected-image-info">
        <span class="info-label">Выбранное изображение:</span>
        <span class="info-value">ID {{ selectedImageId }}</span>
      </div>
      <div v-else class="no-selection">
        Выберите изображение для анализа
      </div>
    </div>

    <!-- Параметры анализа -->
    <KMeansParameters
      v-if="selectedImageId"
      v-model:clusters="clusters"
      v-model:maxIterations="maxIterations"
      v-model:attempts="attempts"
      v-model:criteria="criteria"
      v-model:flags="flags"
      v-model:epsilon="epsilon"
      v-model:colors="colors"
      v-model:isExpanded="isParametersExpanded"
      :is-processing="isProcessing"
      @run-analysis="runKMeansAnalysis"
      @reset-analysis="resetAnalysis"
    />

    <!-- Индикатор загрузки -->
    <div v-if="isProcessing" class="processing-indicator">
      <div class="processing-spinner"></div>
      <div class="processing-text">
        Выполняется K-Means кластеризация...
        <br>
        <small>Результат будет отображен автоматически</small>
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

    <!-- Результаты анализа -->
    <div v-if="result" class="results-section">
      <h5 class="results-title">Результаты анализа</h5>
      
      <!-- Статистика -->
      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-label">Изображение:</span>
          <span class="stat-value">ID {{ result.image_id }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Кластеров:</span>
          <span class="stat-value">{{ result.result.nclusters }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Критерий:</span>
          <span class="stat-value">{{ result.result.criteria }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Точность (ε):</span>
          <span class="stat-value">{{ result.result.epsilon }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Компактность:</span>
          <span class="stat-value">{{ result.result.compactness.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Центроиды -->
      <div class="centroids-section">
        <h6 class="centroids-title">Центроиды кластеров:</h6>
        <div class="centroids-list">
          <div
            v-for="(centroid, index) in result.result.centers_sorted"
            :key="index"
            class="centroid-item"
          >
            <div
              class="centroid-color"
              :style="{ 
                backgroundColor: result.result.colors_rgb[index] ? `rgb(${result.result.colors_rgb[index][0]}, ${result.result.colors_rgb[index][1]}, ${result.result.colors_rgb[index][2]})` : 'transparent'
              }"
            ></div>
            <div class="centroid-info">
              <div class="centroid-name">Кластер {{ index + 1 }}</div>
              <div class="centroid-value">L-канал: {{ centroid.toFixed(2) }}</div>
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
              <span>Загрузка изображения...</span>
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
            <h6 class="image-title">K-Means результат</h6>
            <span class="image-toggle">
              {{ isResultImageCollapsed ? '▼' : '▲' }}
            </span>
          </div>
          <div v-show="!isResultImageCollapsed" class="image-container">
            <div v-if="isLoadingResultImage" class="image-loading">
              <div class="loading-spinner"></div>
              <span>Загрузка результата...</span>
            </div>
            <img
              v-else-if="getResultImageUrl"
              :src="getResultImageUrl"
              alt="K-Means результат"
              class="analysis-image"
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
.kmeans-analysis {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  height: 100%;
  overflow-y: auto;
  padding: var(--spacing-md);
}

/* ... остальные стили остаются те же ... */

.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-sm);
  color: var(--text-color-secondary);
  min-height: 200px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--text-color-secondary);
  background-color: var(--bg-color-accent);
  border-radius: var(--border-radius);
  min-height: 200px;
  font-style: italic;
}

/* ... остальные стили ... */
</style>