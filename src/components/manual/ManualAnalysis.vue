<template>
  <div class="analysis-container" data-v-inspector="src/components/manual/ManualAnalysis.vue:2:3">
    <!-- Информация о выбранном изображении -->
    <div class="analysis-info" data-v-inspector="src/components/manual/ManualAnalysis.vue:4:5">
      <div class="info-header" data-v-inspector="src/components/manual/ManualAnalysis.vue:5:7">
        <h4 class="section-title" data-v-inspector="src/components/manual/ManualAnalysis.vue:6:9">Ручной анализ</h4>
      </div>
      
      <div v-if="selectedImageId" class="selected-image-info" data-v-inspector="src/components/manual/ManualAnalysis.vue:9:7">
        <span class="info-label" data-v-inspector="src/components/manual/ManualAnalysis.vue:10:9">Выбранное изображение:</span>
        <span class="info-value" data-v-inspector="src/components/manual/ManualAnalysis.vue:11:9">ID {{ selectedImageId }}</span>
      </div>
      <div v-else class="no-selection" data-v-inspector="src/components/manual/ManualAnalysis.vue:13:7">
        Выберите изображение для анализа
      </div>
    </div>

    <!-- Верхний блок с изображениями -->
    <!-- ИЗМЕНЕНО: Используем v-else с v-if="uiState.isLoading" ниже, чтобы избежать гонки состояний -->
    <div v-if="selectedImageId && !uiState.isLoading" class="image-display-area" data-v-inspector="src/components/manual/ManualAnalysis.vue:20:5">
      <SimpleImage
        :image-url="imageState.originalUrl"
        title="Оригинальное изображение"
        @load="onOriginalImageLoad"
        @error="onOriginalImageError" data-v-inspector="src/components/manual/ManualAnalysis.vue:21:7"
      />
      
      <InteractiveImage
        :image-url="imageState.blurredUrl"
        :lines-state="linesState" data-v-inspector="src/components/manual/ManualAnalysis.vue:28:7"
      >
        <template #header>
          <div class="image-header-content" data-v-inspector="src/components/manual/ManualAnalysis.vue:33:11">
            <p data-v-inspector="src/components/manual/ManualAnalysis.vue:34:13">Изображение с линиями</p>
            <div class="image-controls" data-v-inspector="src/components/manual/ManualAnalysis.vue:35:13">
              <!-- ОБНОВЛЕННАЯ кнопка для линий -->
              <button 
                class="calculate-btn" 
                @click="calculateMean"
                :disabled="uiState.isCalculating || !hasValidLines"
                :class="{ warning: hasUnsavedLinesChanges }" data-v-inspector="src/components/manual/ManualAnalysis.vue:37:15"
              >
                <span v-if="uiState.isCalculating" data-v-inspector="src/components/manual/ManualAnalysis.vue:43:17">⏳ Вычисляем...</span>
                <span v-else-if="hasUnsavedLinesChanges" data-v-inspector="src/components/manual/ManualAnalysis.vue:44:17">⚠️ Пересчитать</span>
                <span v-else data-v-inspector="src/components/manual/ManualAnalysis.vue:45:17">📊 Вычислить среднее</span>
              </button>
              
              <!-- ОБНОВЛЕННАЯ кнопка отмены для линий -->
              <button 
                v-if="hasUnsavedLinesChanges"
                class="revert-btn"
                @click="linesState.revert"
                title="Отменить изменения линий" data-v-inspector="src/components/manual/ManualAnalysis.vue:49:15"
              >
                ↶ Отменить линии
              </button>
            </div>
          </div>
        </template>
      </InteractiveImage>
    </div>
    <!-- ИЗМЕНЕНО: Показываем плейсхолдеры только во время общей загрузки -->
    <div v-else-if="selectedImageId && uiState.isLoading" class="image-display-area" data-v-inspector="src/components/manual/ManualAnalysis.vue:63:5">
      <div class="image-placeholder" data-v-inspector="src/components/manual/ManualAnalysis.vue:64:7">
        <div class="loading-spinner" data-v-inspector="src/components/manual/ManualAnalysis.vue:65:9"></div>
        <p data-v-inspector="src/components/manual/ManualAnalysis.vue:66:9">Загрузка оригинального изображения...</p>
      </div>
      <div class="image-placeholder" data-v-inspector="src/components/manual/ManualAnalysis.vue:68:7">
        <div class="loading-spinner" data-v-inspector="src/components/manual/ManualAnalysis.vue:69:9"></div>
        <p data-v-inspector="src/components/manual/ManualAnalysis.vue:70:9">Загрузка размытого изображения...</p>
      </div>
    </div>

    <!-- ОБНОВЛЕННОЕ предупреждение о несохраненных изменениях линий -->
    <div v-if="hasUnsavedLinesChanges" class="warning-banner lines-warning" data-v-inspector="src/components/manual/ManualAnalysis.vue:75:5">
      <div class="warning-content" data-v-inspector="src/components/manual/ManualAnalysis.vue:76:7">
        <span class="warning-icon" data-v-inspector="src/components/manual/ManualAnalysis.vue:77:9">⚠️</span>
        <span class="warning-text" data-v-inspector="src/components/manual/ManualAnalysis.vue:78:9">
          У вас есть несохраненные изменения линий. 
          Нажмите "Пересчитать" для сохранения или "Отменить" для отката.
        </span>
        <div class="warning-actions" data-v-inspector="src/components/manual/ManualAnalysis.vue:82:9">
          <button 
            class="warning-btn save"
            @click="calculateMean"
            :disabled="uiState.isCalculating || !hasValidLines" data-v-inspector="src/components/manual/ManualAnalysis.vue:83:11"
          >
            💾 Пересчитать
          </button>
          <button 
            class="warning-btn cancel"
            @click="linesState.revert" data-v-inspector="src/components/manual/ManualAnalysis.vue:90:11"
          >
            ↶ Отменить
          </button>
        </div>
      </div>
    </div>

    <!-- Информация о линиях -->
    <div class="lines-info" data-v-inspector="src/components/manual/ManualAnalysis.vue:101:5">
      <div class="info-section" data-v-inspector="src/components/manual/ManualAnalysis.vue:102:7">
        <h4 data-v-inspector="src/components/manual/ManualAnalysis.vue:103:9">Текущие линии:</h4>
        <div class="lines-summary" data-v-inspector="src/components/manual/ManualAnalysis.vue:104:9">
          <div class="line-count" data-v-inspector="src/components/manual/ManualAnalysis.vue:105:11">
            <strong data-v-inspector="src/components/manual/ManualAnalysis.vue:106:13">Горизонтальные:</strong> {{ linesState.horizontal.length }} 
            ({{ linesState.horizontal.length + 1 }} строк)
          </div>
          <div class="line-count" data-v-inspector="src/components/manual/ManualAnalysis.vue:109:11">
            <strong data-v-inspector="src/components/manual/ManualAnalysis.vue:110:13">Вертикальные:</strong> {{ linesState.vertical.length }} 
            ({{ linesState.vertical.length + 1 }} столбцов)
          </div>
        </div>
      </div>
      
      <!-- Координаты линий в пикселях -->
      <div class="coordinates-info" v-if="imageState.dimensions" data-v-inspector="src/components/manual/ManualAnalysis.vue:117:7">
        <details data-v-inspector="src/components/manual/ManualAnalysis.vue:118:9">
          <summary data-v-inspector="src/components/manual/ManualAnalysis.vue:119:11">Координаты линий в пикселях</summary>
          <div class="coordinates-grid" data-v-inspector="src/components/manual/ManualAnalysis.vue:120:11">
            <div v-if="horizontalPixelLines.length > 0" data-v-inspector="src/components/manual/ManualAnalysis.vue:121:13">
              <strong data-v-inspector="src/components/manual/ManualAnalysis.vue:122:15">Горизонтальные (Y):</strong>
              <span class="coordinate-list" data-v-inspector="src/components/manual/ManualAnalysis.vue:123:15">{{ horizontalPixelLines.join(', ') }}</span>
            </div>
            <div v-if="verticalPixelLines.length > 0" data-v-inspector="src/components/manual/ManualAnalysis.vue:125:13">
              <strong data-v-inspector="src/components/manual/ManualAnalysis.vue:126:15">Вертикальные (X):</strong>
              <span class="coordinate-list" data-v-inspector="src/components/manual/ManualAnalysis.vue:127:15">{{ verticalPixelLines.join(', ') }}</span>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- СТАТИЧНАЯ таблица светимости -->
    <BrightnessTable
      ref="brightnessTableRef"
      :table-state="tableState"
      :categories="categories"
      :column-intervals="columnIntervals"
      :row-intervals="rowIntervals"
      v-model:selections="cellsState.current"
      @data-change="onTableDataChange"
      @size-change="onTableSizeChange" data-v-inspector="src/components/manual/ManualAnalysis.vue:135:5"
    />

    <!-- НОВОЕ предупреждение о несохраненных изменениях ячеек -->
    <div v-if="cellsState.hasUnsavedChanges" class="warning-banner cells-warning" data-v-inspector="src/components/manual/ManualAnalysis.vue:147:5">
      <div class="warning-content" data-v-inspector="src/components/manual/ManualAnalysis.vue:148:7">
        <span class="warning-icon" data-v-inspector="src/components/manual/ManualAnalysis.vue:149:9">⚠️</span>
        <span class="warning-text" data-v-inspector="src/components/manual/ManualAnalysis.vue:150:9">
          У вас есть несохраненные изменения выбора ячеек. 
          Нажмите "Сохранить" для фиксации или "Отменить" для отката.
        </span>
        <div class="warning-actions" data-v-inspector="src/components/manual/ManualAnalysis.vue:154:9">
          <button 
            class="warning-btn save"
            @click="saveCategorizedMean"
            :disabled="uiState.isCalculating || !hasSelectedCells" data-v-inspector="src/components/manual/ManualAnalysis.vue:155:11"
          >
            💾 Сохранить выбор
          </button>
          <button 
            class="warning-btn cancel"
            @click="cellsState.revert" data-v-inspector="src/components/manual/ManualAnalysis.vue:162:11"
          >
            ↶ Отменить выбор
          </button>
        </div>
      </div>
    </div>
    
    <!-- Статистика по категориям -->
    <CategoryStatistics
      :statistics="categoryStatistics"
      :total-average="totalAverage" data-v-inspector="src/components/manual/ManualAnalysis.vue:173:5"
    />

    <!-- Статус загрузки -->
    <div v-if="uiState.isLoading" class="loading-overlay" data-v-inspector="src/components/manual/ManualAnalysis.vue:179:5">
      <div class="loading-content" data-v-inspector="src/components/manual/ManualAnalysis.vue:180:7">
        <div class="loading-spinner" data-v-inspector="src/components/manual/ManualAnalysis.vue:181:9"></div>
        <div class="loading-text" data-v-inspector="src/components/manual/ManualAnalysis.vue:182:9">{{ uiState.loadingText }}</div>
      </div>
    </div>

    <!-- Сообщение об ошибке -->
    <div v-if="uiState.errorMessage" class="error-message" data-v-inspector="src/components/manual/ManualAnalysis.vue:187:5">
      <div class="error-content" data-v-inspector="src/components/manual/ManualAnalysis.vue:188:7">
        <span class="error-icon" data-v-inspector="src/components/manual/ManualAnalysis.vue:189:9">❌</span>
        <span class="error-text" data-v-inspector="src/components/manual/ManualAnalysis.vue:190:9">{{ uiState.errorMessage }}</span>
        <button class="retry-btn" @click="uiState.clearError" data-v-inspector="src/components/manual/ManualAnalysis.vue:191:9">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, reactive } from 'vue'
import SimpleImage from '@/components/manual/SimpleImage.vue'
import InteractiveImage from '@/components/manual/InteractiveImage.vue'
import BrightnessTable from '@/components/manual/BrightnessTable.vue'
import CategoryStatistics from '@/components/CategoryStatistics.vue'
import { manualAnalysisAPI, type ManualLine, type ManualResult, type CategorizedMeanResponse } from '@/api/manual'

interface Props {
  selectedImageId: number | null
  datasetId: number
}

const props = defineProps<Props>()

// ID изображения теперь приходит из props
const imageId = computed(() => props.selectedImageId)

// --- ОБЪЕДИНЕННЫЕ СТРУКТУРЫ СОСТОЯНИЯ ---

// Состояние UI (загрузка, ошибки)
const uiState = reactive({
  isLoading: false,
  loadingText: '',
  errorMessage: '',
  isCalculating: false,
  clearError() {
    this.errorMessage = ''
  },
  setLoading(status: boolean, text = '') {
    this.isLoading = status
    this.loadingText = text
  },
  setCalculating(status: boolean) {
    this.isCalculating = status
  }
})

// Состояние изображений теперь является вычисляемым свойством,
// которое берет данные напрямую из API, устраняя дублирование.
const imageState = computed(() => {
  if (!imageId.value) {
    return { originalUrl: '', blurredUrl: '', dimensions: null }
  }
  const state = manualAnalysisAPI.getAnalysisState(imageId.value)
  return {
    originalUrl: state.originalImageBase64 || '',
    blurredUrl: state.blurredImageBase64 || '',
    dimensions: state.imageDimensions
  }
})

// Состояние линий
const linesState = reactive({
  horizontal: [] as ManualLine[],
  vertical: [] as ManualLine[],
  saved: {
    horizontal: [] as ManualLine[],
    vertical: [] as ManualLine[]
  },
  get hasUnsavedChanges() {
    if (!imageId.value) return false
    return !arraysEqual(this.horizontal, this.saved.horizontal) ||
           !arraysEqual(this.vertical, this.saved.vertical)
  },
  save() {
    this.saved.horizontal = JSON.parse(JSON.stringify(this.horizontal))
    this.saved.vertical = JSON.parse(JSON.stringify(this.vertical))
  },
  revert() {
    this.horizontal = JSON.parse(JSON.stringify(this.saved.horizontal))
    this.vertical = JSON.parse(JSON.stringify(this.saved.vertical))
  },
  update(newLines: { horizontal: ManualLine[], vertical: ManualLine[] }) {
    this.horizontal = newLines.horizontal
    this.vertical = newLines.vertical
  },
  reset() {
    this.horizontal = []
    this.vertical = []
    this.saved.horizontal = []
    this.saved.vertical = []
  }
})

// Состояние ячеек таблицы
const cellsState = reactive({
  current: {} as Record<string, string>,
  saved: {} as Record<string, string>,
  get hasUnsavedChanges() {
    if (!imageId.value) return false
    return !objectsEqual(this.current, this.saved)
  },
  save() {
    this.saved = { ...this.current }
  },
  revert() {
    // Просто меняем current, v-model передаст это в дочерний компонент
    this.current = { ...this.saved }
  },
  // Метод update больше не нужен, v-model делает это автоматически
  // update(selection: Record<string, string>) { ... }
  reset() {
    this.current = {}
    this.saved = {}
  }
})

// Состояние данных таблицы
const tableState = reactive({
  data: [] as number[][],
  rows: 4,
  cols: 4,
  yBlockSize: 16,
  xBlockSize: 18,
  reset() {
    this.data = []
    this.rows = 4
    this.cols = 4
  }
})

// --- КОНЕЦ СТРУКТУР СОСТОЯНИЯ ---

// Результаты с сервера
const serverResult = ref<ManualResult | null>(null)
const categorizedResult = ref<CategorizedMeanResponse | null>(null)

// Категории для классификации
const categories = ref([
  { id: 'epidermis', name: 'Эпидермис', color: '#90EE90' },
  { id: 'dermis', name: 'Дерма', color: '#FFFEE2' }
])

// Ссылка на компонент таблицы
const brightnessTableRef = ref<InstanceType<typeof BrightnessTable> | null>(null)

// Вычисляемые свойства
const categoryStatistics = computed(() => {
  return brightnessTableRef.value?.getCategoryStatistics || []
})

const totalAverage = computed(() => {
  // The totalAverage property on the BrightnessTable component is a property.
  return brightnessTableRef.value?.totalAverage || 0
})

// РАЗДЕЛЕННЫЕ проверки на несохраненные изменения (теперь используют геттеры)
const hasUnsavedLinesChanges = computed(() => linesState.hasUnsavedChanges)
const hasUnsavedCellsChanges = computed(() => cellsState.hasUnsavedChanges)

// ОБЩАЯ проверка для блокировки перехода
const hasAnyUnsavedChanges = computed(() => {
  return hasUnsavedLinesChanges.value || hasUnsavedCellsChanges.value
})

// Проверка валидности линий
const hasValidLines = computed(() => {
  return linesState.horizontal.length > 0 && linesState.vertical.length > 0
})

// НОВОЕ: Проверка наличия выбранных ячеек
const hasSelectedCells = computed(() => {
  return Object.keys(cellsState.current).length > 0
})

// Координаты линий в пикселях (только для отображения)
const horizontalPixelLines = computed(() => {
  if (!imageState.value.dimensions) return []
  return linesState.horizontal
    .map(line => Math.round(line.relativeY * imageState.value.dimensions!.height))
    .sort((a, b) => a - b)
})

const verticalPixelLines = computed(() => {
  if (!imageState.value.dimensions) return []
  return linesState.vertical
    .map(line => Math.round(line.relativeX * imageState.value.dimensions!.width))
    .sort((a, b) => a - b)
})

// НОВЫЕ computed свойства для интервалов заголовков (ИСПРАВЛЕНО)
const columnIntervals = computed(() => {
  if (!imageState.value.dimensions || !imageId.value) {
    return []
  }
  
  // ИСПРАВЛЕНО: Используем данные от сервера, которые включают границы
  const state = manualAnalysisAPI.getAnalysisState(imageId.value)
  if (!state.lastServerResult) {
    return []
  }
  
  const verticalLinesWithBounds = state.lastServerResult.parameters.vertical_lines
  console.log('Creating column intervals from server lines:', verticalLinesWithBounds)
  
  const intervals = []
  for (let i = 0; i < verticalLinesWithBounds.length - 1; i++) {
    const start = verticalLinesWithBounds[i]
    const end = verticalLinesWithBounds[i + 1]
    if (end !== undefined) {
      intervals.push(`${start} - ${end - 1}`)
    }
  }
  
  console.log('Generated column intervals:', intervals)
  return intervals
})

const rowIntervals = computed(() => {
  if (!imageState.value.dimensions || !imageId.value) {
    return []
  }
  
  // ИСПРАВЛЕНО: Используем данные от сервера, которые включают границы
  const state = manualAnalysisAPI.getAnalysisState(imageId.value)
  if (!state.lastServerResult) {
    return []
  }
  
  const horizontalLinesWithBounds = state.lastServerResult.parameters.horizontal_lines
  console.log('Creating row intervals from server lines:', horizontalLinesWithBounds)
  
  const intervals = []
  for (let i = 0; i < horizontalLinesWithBounds.length - 1; i++) {
    const start = horizontalLinesWithBounds[i]
    const end = horizontalLinesWithBounds[i + 1]
    if (end !== undefined) {
      intervals.push(`${start} - ${end - 1}`)
    }
  }
  
  console.log('Generated row intervals:', intervals)
  return intervals
})

// Функции сравнения для определения изменений
const arraysEqual = (a: ManualLine[], b: ManualLine[]): boolean => {
  if (a.length !== b.length) return false
  
  return a.every((lineA, index) => {
    const lineB = b[index]
    if (!lineB) return false
    
    return lineA.id === lineB.id &&
           Math.abs(lineA.relativeX - lineB.relativeX) < 0.001 &&
           Math.abs(lineA.relativeY - lineB.relativeY) < 0.001
  })
}

const objectsEqual = (a: Record<string, string>, b: Record<string, string>): boolean => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  
  if (keysA.length !== keysB.length) return false
  
  return keysA.every(key => a[key] === b[key])
}

// РАЗДЕЛЕННЫЕ функции сохранения состояния (теперь не нужны, используем методы)
// const saveLinesState = () => { ... }
// const saveCellsState = () => { ... }

// РАЗДЕЛЕННЫЕ функции сброса к сохраненному состоянию (теперь не нужны, используем методы)
// const revertLinesToSavedState = () => { ... }
// const revertCellsToSavedState = () => { ... }

// Сброс состояния при смене изображения
const resetComponentState = () => {
  // imageState.reset() больше не нужен, так как imageState - это computed
  linesState.reset()
  cellsState.reset()
  tableState.reset()
  serverResult.value = null
  categorizedResult.value = null
  uiState.clearError()
  uiState.setLoading(false)
  uiState.setCalculating(false)
}

// Загрузка данных для изображения
const loadImageData = async () => {
  if (!imageId.value) {
    resetComponentState()
    return
  }
  
  try {
    // Устанавливаем isLoading в true в самом начале
    uiState.setLoading(true, 'Загрузка изображений...')
    uiState.clearError()
    
    console.log(`Loading data for image ${imageId.value}`)
    
    // Последовательно загружаем все необходимые данные
    await manualAnalysisAPI.loadOriginalImage(imageId.value)
    
    uiState.setLoading(true, 'Получение размытого изображения...')
    await manualAnalysisAPI.getBlurredImage(imageId.value)
    
    uiState.setLoading(true, 'Проверка существующих результатов...')
    const existingResult = await manualAnalysisAPI.checkExistingResult(imageId.value)
    
    if (existingResult) {
      console.log('Found existing result, restoring data...')
      // Восстанавливаем данные из результата
      serverResult.value = existingResult
      tableState.data = existingResult.brightness_data
      
      tableState.rows = existingResult.brightness_data.length
      tableState.cols = existingResult.brightness_data[0]?.length || 0
      
      // Восстанавливаем линии
      const updatedState = manualAnalysisAPI.getAnalysisState(imageId.value)
      linesState.horizontal = updatedState.currentLines.horizontal
      linesState.vertical = updatedState.currentLines.vertical
      
      // УЛУЧШЕНО: Восстановление категоризованного результата и выделений ячеек
      try {
        uiState.setLoading(true, 'Восстановление выделений ячеек...')
        const categorizedRes = await manualAnalysisAPI.getCategorizedMeanResult(imageId.value)
        if (categorizedRes) {
          categorizedResult.value = categorizedRes
          
          // Восстанавливаем выделения ячеек из категоризованного результата
          const restoredSelections: Record<string, string> = {}
          
          // ИСПРАВЛЕНО: Проверяем наличие свойства categoryResults в ответе
          if (categorizedRes.categoryResults && Array.isArray(categorizedRes.categoryResults)) {
            categorizedRes.categoryResults.forEach(categoryResult => {
              if (categoryResult.cells && Array.isArray(categoryResult.cells)) {
                categoryResult.cells.forEach(cell => {
                  const cellKey = `${cell.row}-${cell.col}`
                  restoredSelections[cellKey] = categoryResult.categoryId
                })
              }
            })
          }
          
          // ПРОСТО ОБНОВЛЯЕМ РЕАКТИВНОЕ СОСТОЯНИЕ
          cellsState.current = restoredSelections
          
          console.log('Restored cell selections:', restoredSelections)
          
        }
      } catch (error) {
        console.log('No categorized result found, this is normal for new images')
        cellsState.current = {}
      }
      
      // Сохраняем как исходное состояние
      linesState.save()
      cellsState.save()
      
    } else {
      console.log('No existing result, initializing default lines...')
      // Инициализируем линии по умолчанию
      const defaultLines = manualAnalysisAPI.initializeDefaultLines(imageId.value)
      linesState.horizontal = defaultLines.horizontal
      linesState.vertical = defaultLines.vertical
      
      // Устанавливаем размеры таблицы по умолчанию
      tableState.rows = linesState.horizontal.length + 1
      tableState.cols = linesState.vertical.length + 1
      
      // Очищаем выделения для нового изображения
      cellsState.current = {}
      
      // Сохраняем как исходное состояние
      linesState.save()
      cellsState.save()
    }
    
    console.log('Image data loaded successfully')
    
  } catch (error) {
    console.error('Error loading image data:', error)
    uiState.errorMessage = manualAnalysisAPI.formatError(error)
  } finally {
    // Сбрасываем isLoading в false только после того, как ВСЕ операции завершены
    uiState.setLoading(false)
  }
}

// УПРОЩЕННЫЙ пересчет среднего
const calculateMean = async () => {
  if (!imageId.value || uiState.isCalculating || !hasValidLines.value) return
  
  try {
    uiState.setCalculating(true)
    uiState.setLoading(true, 'Вычисление среднего значения...')
    uiState.clearError()
    
    const result = await manualAnalysisAPI.calculateMeanLines(imageId.value)
    const categorizedRes = await manualAnalysisAPI.getCategorizedMeanResult(imageId.value)
    
    console.log('Received result from API:', result)
    
    serverResult.value = result
    tableState.rows = result.brightness_data.length
    tableState.cols = result.brightness_data[0]?.length || 0
    tableState.data = result.brightness_data
    
    // Обновляем размеры блоков
    const state = manualAnalysisAPI.getAnalysisState(imageId.value)
    if (state.imageDimensions) {
      tableState.yBlockSize = Math.round(state.imageDimensions.height / tableState.rows)
      tableState.xBlockSize = Math.round(state.imageDimensions.width / tableState.cols)
    }
    
    // Синхронизируем линии
    linesState.horizontal = [...state.currentLines.horizontal]
    linesState.vertical = [...state.currentLines.vertical]
    
    // Сохраняем состояние линий
    linesState.save()
    
    console.log('Mean calculation completed successfully')
    
  } catch (error) {
    console.error('Error calculating mean:', error)
    uiState.errorMessage = manualAnalysisAPI.formatError(error)
  } finally {
    uiState.setCalculating(false)
    uiState.setLoading(false)
  }
}

// НОВАЯ вспомогательная функция для конвертации линий
const convertRelativeLinesToPixels = (
  lines: { horizontal: ManualLine[], vertical: ManualLine[] },
  dimensions: { width: number; height: number }
): { verticalPixels: number[]; horizontalPixels: number[] } => {
  const verticalPixels = lines.vertical
    .map(line => Math.round(line.relativeX * dimensions.width))
    .sort((a, b) => a - b)

  const horizontalPixels = lines.horizontal
    .map(line => Math.round(line.relativeY * dimensions.height))
    .sort((a, b) => a - b)

  // Добавляем границы изображения
  const allVertical = [0, ...verticalPixels.filter(x => x > 0 && x < dimensions.width), dimensions.width]
  const allHorizontal = [0, ...horizontalPixels.filter(y => y > 0 && y < dimensions.height), dimensions.height]

  return { 
    verticalPixels: [...new Set(allVertical)].sort((a, b) => a - b),
    horizontalPixels: [...new Set(allHorizontal)].sort((a, b) => a - b)
  }
}

// НОВОЕ: Сохранение категоризованного анализа (только для ячеек)
const saveCategorizedMean = async () => {
  if (!imageId.value || !hasSelectedCells.value || uiState.isCalculating) {
    return
  }

  try {
    uiState.setCalculating(true)
    uiState.setLoading(true, 'Сохранение выбора ячеек...')
    
    // Подготавливаем данные для запроса
    const selectedCellsArray = Object.entries(cellsState.current)
      .map(([cellKey, categoryId]) => {
        const [rowStr, colStr] = cellKey.split('-')
        const row = Number(rowStr)
        const col = Number(colStr)
        return { row, col, categoryId }
      })
      .filter((item): item is { row: number; col: number; categoryId: string } => 
        !isNaN(item.row) && !isNaN(item.col)
      )

    const result = await manualAnalysisAPI.calculateCategorizedMeanFixed(
      imageId.value,
      selectedCellsArray,
      categories.value
    )

    // Валидация ответа
    validateCategorizedResponse(result)

    categorizedResult.value = result
    
    // ДОБАВЛЕНО: Пересчитываем все средние после сохранения категорий
    if (imageId.value) {
      await manualAnalysisAPI.recalculateAllMeans(imageId.value)
      
      // Принудительно обновляем таблицу
      await nextTick()
      if (brightnessTableRef.value) {
        // This method likely recalculates statistics when called.
        brightnessTableRef.value.getCategoryStatistics
      }
    }
    
    // Сохраняем ТОЛЬКО состояние ячеек
    cellsState.save()
    
    console.log('Categorized mean saved:', result)
    
  } catch (error) {
    console.error('Error saving categorized mean:', error)
    uiState.errorMessage = `Ошибка сохранения категорий: ${manualAnalysisAPI.formatError(error)}`
  } finally {
    uiState.setCalculating(false)
    uiState.setLoading(false)
  }
}

// НОВОЕ: Валидация ответа категоризованного анализа
const validateCategorizedResponse = (response: CategorizedMeanResponse) => {
  const currentTableRows = tableState.rows
  const currentTableCols = tableState.cols
  
  // Проверяем размеры таблицы
  const expectedTotalCells = currentTableRows * currentTableCols
  if (response.totalCells !== expectedTotalCells) {
    throw new Error(
      `Несоответствие размера таблицы: ожидается ${expectedTotalCells} ячеек, получено ${response.totalCells}`
    )
  }

  // Проверяем количество выбранных ячеек
  const currentSelectedCount = Object.keys(cellsState.current).length
  if (response.selectedCellsCount !== currentSelectedCount) {
    throw new Error(
      `Несоответствие количества выбранных ячеек: ожидается ${currentSelectedCount}, получено ${response.selectedCellsCount}`
    )
  }

  // Проверяем соответствие линий
  const currentVerticalPixels = verticalPixelLines.value
  const currentHorizontalPixels = horizontalPixelLines.value
  
  if (!arraysEqualNumbers(response.verticalLines, currentVerticalPixels)) {
    console.warn('Вертикальные линии не совпадают:', {
      expected: currentVerticalPixels,
      received: response.verticalLines
    })
  }

  if (!arraysEqualNumbers(response.horizontalLines, currentHorizontalPixels)) {
    console.warn('Горизонтальные линии не совпадают:', {
      expected: currentHorizontalPixels,
      received: response.horizontalLines
    })
  }

  console.log('Categorized response validation passed')
}

// ВСПОМОГАТЕЛЬНАЯ: Сравнение числовых массивов
const arraysEqualNumbers = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false
  return a.every((val, index) => {
    const bVal = b[index]
    return bVal !== undefined && Math.abs(val - bVal) <= 1 // Допускаем погрешность в 1 пиксель
  })
}

// ОБНОВЛЕННАЯ: Проверка при смене изображения
const checkUnsavedChangesBeforeSwitch = async (newId: number | null, oldId: number | null): Promise<boolean> => {
  if (!oldId || !hasAnyUnsavedChanges.value) return true
  
  const changesTypes: string[] = []
  if (hasUnsavedLinesChanges.value) changesTypes.push('линии')
  if (hasUnsavedCellsChanges.value) changesTypes.push('выбор ячеек')
  
  const userChoice = await showUnsavedChangesDialog(changesTypes)
  
  switch (userChoice) {
    case 'save':
      // Сохраняем все изменения
      try {
        if (hasUnsavedLinesChanges.value) {
          await calculateMean()
        }
        if (hasUnsavedCellsChanges.value) {
          await saveCategorizedMean()
        }
        return true
      } catch (error) {
        console.error('Error saving changes:', error)
        return false
      }
    
    case 'discard':
      // Отбрасываем все изменения
      if (hasUnsavedLinesChanges.value) {
        linesState.revert()
      }
      if (hasUnsavedCellsChanges.value) {
        cellsState.revert()
      }
      return true
      
    case 'cancel':
    default:
      // Отменяем переключение
      return false
  }
}

// ОБНОВЛЕННЫЙ диалог
const showUnsavedChangesDialog = (changesTypes: string[]): Promise<'save' | 'discard' | 'cancel'> => {
  return new Promise((resolve) => {
    const changesText = changesTypes.join(' и ')
    const result = confirm(`У вас есть несохраненные изменения: ${changesText}.\n\nВыберите действие:\n- OK - Сохранить изменения\n- Отмена - Отбросить изменения`)
    
    if (result) {
      resolve('save')
    } else {
      const discard = confirm('Точно отбросить все изменения?')
      resolve(discard ? 'discard' : 'cancel')
    }
  })
}

// УПРОЩЕННОЕ обновление таблицы
const updateTableAfterImageChange = async () => {
  if (!imageId.value) return
  
  console.log('Updating table after image change')
  
  try {
    // Получаем данные от API
    const tableUpdate = await manualAnalysisAPI.safeUpdateTableForNewImage(imageId.value)
    
    if (tableUpdate.success) {
      // Обновляем размеры
      tableState.rows = tableUpdate.dimensions.rows
      tableState.cols = tableUpdate.dimensions.cols
      
      // Обновляем данные, если они есть
      if (tableUpdate.cellMeans) {
        tableState.data = tableUpdate.cellMeans
      } else {
        tableState.data = [] // Очищаем данные, если их нет
      }
      
      // Обновляем выделения
      if (tableUpdate.cellSelections) {
        cellsState.current = tableUpdate.cellSelections
      } else {
        cellsState.current = {}

      console.log('Table state updated reactively')
    }
  }
  } catch (error) {
    console.error('Error updating table:', error)
  }
}

// ОСНОВНОЙ WATCHER упрощается
watch(() => props.selectedImageId, async (newId, oldId) => {
  console.log('Selected image ID changing:', { from: oldId, to: newId })
  
  const canSwitch = await checkUnsavedChangesBeforeSwitch(newId, oldId ?? null)
  
  if (!canSwitch) {
    console.log('Switch cancelled due to unsaved changes')
    return
  }
  
  if (oldId && oldId !== newId) {
    manualAnalysisAPI.clearAnalysisState(oldId)
  }
  
  resetComponentState()
  
  if (newId) {
    await loadImageData()
    // Простой вызов обновления таблицы
    await updateTableAfterImageChange()
  }
}, { immediate: true })

// onLinesChanged больше не нужен, так как дочерний компонент мутирует linesState напрямую

// Остальные обработчики остаются без изменений
const onOriginalImageLoad = (event: Event) => {
  console.log('Original image loaded successfully')
}

const onOriginalImageError = (event: Event) => {
  console.error('Failed to load original image')
  uiState.errorMessage = 'Ошибка загрузки оригинального изображения'
}

const onTableDataChange = (data: number[][]) => {
  console.log('Table data changed:', data)
}

const onTableSizeChange = (size: { rows: number, cols: number }) => {
  console.log('Table size changed:', size)
}

const clearError = () => {
  uiState.clearError()
}

// Предупреждение при уходе со страницы
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (imageId.value && hasAnyUnsavedChanges.value) {
    const message = 'У вас есть несохраненные изменения. Если вы покинете страницу, все изменения будут потеряны.'
    event.returnValue = message
    return message
  }
}

onMounted(() => {
  console.log('ManualAnalysis component mounted', { selectedImageId: props.selectedImageId })
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  console.log('ManualAnalysis component unmounting')
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // Очищаем состояние при размонтировании
  if (imageId.value) {
    manualAnalysisAPI.clearAnalysisState(imageId.value)
  }
})
</script>

<style scoped>
/* Все существующие стили остаются */
.analysis-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--bg-color-secondary);
  position: relative;
}

.image-display-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.image-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.image-header-content p {
  margin: 0;
}

.image-controls {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.calculate-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.calculate-btn:hover:not(:disabled) {
  background: var(--primary-color-dark);
  transform: translateY(-1px);
}

.calculate-btn:disabled {
  background: var(--border-color);
  cursor: not-allowed;
  transform: none;
}

.calculate-btn.warning {
  background: var(--warning-color);
  animation: pulse 2s infinite;
}

.revert-btn {
  background: var(--warning-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.revert-btn:hover {
  background: var(--warning-color-dark);
  transform: translateY(-1px);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.warning-banner {
  border: 1px solid var(--warning-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin: var(--spacing-sm) 0;
}

/* НОВЫЕ стили для разных типов предупреждений */
.warning-banner.lines-warning {
  background: linear-gradient(135deg, var(--warning-color), var(--warning-color-dark));
}

.warning-banner.cells-warning {
  background: linear-gradient(135deg, var(--info-color), var(--info-color-dark));
}

.warning-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.warning-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.warning-text {
  font-size: var(--font-size-sm);
  line-height: 1.4;
  color: white;
}

.warning-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-left: auto;
}

.warning-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--border-radius);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.warning-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.warning-btn.save {
  background: var(--success-color);
  border-color: var(--success-color);
}

.warning-btn.save:hover {
  background: var(--success-color-dark);
}

.warning-btn.cancel {
  background: var(--error-color);
  border-color: var(--error-color);
}

.warning-btn.cancel:hover {
  background: var(--error-color-dark);
}

/* Остальные стили остаются без изменений... */
.lines-info {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}

.lines-info h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-color);
}

.lines-summary {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}

.line-count {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
}

.coordinates-info {
  border-top: 1px solid var(--border-color);
  padding-top: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.coordinates-info summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--text-color-secondary);
  font-size: var(--font-size-sm);
}

.coordinates-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--bg-color-secondary);
  border-radius: var(--border-radius-sm);
}

.coordinate-list {
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-xs);
  color: var(--text-color);
  background: var(--bg-color);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  margin-left: var(--spacing-sm);
  display: inline-block;
  max-width: 100%;
  overflow-x: auto;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  background: var(--bg-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: var(--font-size-base);
  color: var(--text-color);
  text-align: center;
}

.error-message {
  background: var(--error-color);
  color: white;
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin: var(--spacing-sm) 0;
}

.error-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  font-size: var(--font-size-sm);
}

.retry-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .image-display-area {
    grid-template-columns: 1fr;
  }
  
  .analysis-container {
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }
  
  .image-header-content {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }
  
  .lines-summary {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .coordinate-list {
    font-size: 10px;
  }
}

/* Добавляем стили для info секции */
.analysis-info {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.section-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-color);
}

.selected-image-info {
  display: flex;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.info-label {
  color: var(--text-color-secondary);
}

.info-value {
  color: var(--text-color);
  font-weight: 500;
}

.no-selection {
  color: var(--text-color-secondary);
  font-style: italic;
  font-size: var(--font-size-sm);
}
</style>
