<template>
  <div class="combo-root">
    <div class="controls">
      <button
        class="toggle-btn"
        :class="{ active: hasWindow('original') }"
        :disabled="!imageId || isLoadingOriginal"
        @click="toggleWindow('original')"
      >
        {{ isLoadingOriginal ? 'Загрузка...' : 'Оригинал' }}
      </button>

      <button
        class="toggle-btn"
        :class="{ active: hasWindow('blurred') }"
        :disabled="!imageId || isLoadingBlurred"
        @click="toggleWindow('blurred')"
      >
        {{ isLoadingBlurred ? 'Загрузка...' : 'Размытое' }}
      </button>

      <button
        class="toggle-btn"
        :class="{ active: hasWindow('kmeans-image') }"
        :disabled="!imageId || isKMeansLoading"
        @click="toggleWindow('kmeans-image')"
      >
        {{ isKMeansLoading ? 'K-means...' : 'K-means изображение' }}
      </button>

      <button
        class="toggle-btn"
        :class="{ active: hasWindow('kmeans-results') }"
        :disabled="!imageId || isKMeansLoading"
        @click="toggleWindow('kmeans-results')"
      >
        {{ isKMeansLoading ? 'K-means...' : 'K-means результаты' }}
      </button>
    </div>

    <div ref="comboContainer" class="canvas">
      <div v-if="!imageId" class="empty-hint">Выберите изображение для анализа</div>
      <div v-else-if="windows.length === 0" class="empty-hint">Включите триггеры сверху, чтобы показать окна</div>

      <Vue3DraggableResizable
        v-for="win in windows"
        :key="win.id"
        v-model:x="win.x"
        v-model:y="win.y"
        v-model:w="win.width"
        v-model:h="win.height"
        :min-w="MIN_WINDOW_WIDTH"
        :min-h="MIN_WINDOW_HEIGHT"
        :parent="true"
        :z="win.zIndex"
        class="floating-window"
        @activated="bringToFront(win.id)"
      >
        <div class="window-shell" @mousedown="bringToFront(win.id)">
          <div class="window-header">
            <span>{{ win.title }}</span>
            <button class="close-btn" @click="removeWindow(win.type)">✕</button>
          </div>

          <div class="window-content">
            <template v-if="win.type === 'original'">
              <SimpleImage
                v-if="imageState.originalUrl"
                :image-url="imageState.originalUrl"
                title="Оригинальное изображение"
              />
              <div v-else class="content-hint">Оригинал ещё не загружен</div>
            </template>

            <template v-else-if="win.type === 'blurred'">
              <SimpleImage
                v-if="imageState.blurredUrl"
                :image-url="imageState.blurredUrl"
                title="Размытое изображение"
              />
              <div v-else class="content-hint">Размытое изображение недоступно</div>
            </template>

            <template v-else-if="win.type === 'kmeans-image'">
              <div class="kmeans-panel">
                <SimpleImage
                  v-if="kmeansResultImageUrl"
                  :image-url="kmeansResultImageUrl"
                  title="K-means результат"
                />
                <div v-else class="content-hint">
                  {{ isKMeansLoading ? 'Выполняется K-means...' : 'Нет изображения результата' }}
                </div>
              </div>
            </template>

            <template v-else>
              <div class="kmeans-panel">
                <div class="kmeans-stats full-height">
                  <h4>Результаты K-means</h4>

                  <div v-if="kmeansResult" class="stats-grid">
                    <div><b>Статус:</b> {{ kmeansResult.status }}</div>
                    <div><b>Кластеров:</b> {{ kmeansResult.result.nclusters ?? '-' }}</div>
                    <div><b>Компактность:</b> {{ formatCompactness(kmeansResult.result.compactness) }}</div>
                    <div><b>Критерий:</b> {{ kmeansResult.result.criteria ?? '-' }}</div>
                    <div><b>Пикселей:</b> {{ kmeansResult.result.processed_pixels ?? '-' }}</div>
                  </div>

                  <div v-else class="content-hint small">Результаты не получены</div>

                  <div v-if="kmeansClusterRows.length" class="color-list">
                    <div v-for="row in kmeansClusterRows" :key="row.clusterIndex" class="color-row cluster-row">
                      <span
                        class="color-box"
                        :style="row.color ? { backgroundColor: `rgb(${row.color[0]}, ${row.color[1]}, ${row.color[2]})` } : {}"
                      ></span>
                      <div class="cluster-meta">
                        <div><b>Кластер {{ row.clusterIndex + 1 }}</b></div>
                        <div>RGB: {{ row.color ? `(${row.color[0]}, ${row.color[1]}, ${row.color[2]})` : '-' }}</div>
                        <div>Центр L: {{ row.intensityCenter ?? '-' }}</div>
                        <div>Пикселей: {{ row.pixelCount ?? '-' }}</div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="content-hint small">Кластеры отсутствуют</div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Vue3DraggableResizable>
    </div>

    <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import Vue3DraggableResizable from 'vue3-draggable-resizable'
import 'vue3-draggable-resizable/dist/Vue3DraggableResizable.css'
import SimpleImage from '@/components/manual/SimpleImage.vue'
import { manualAnalysisAPI } from '@/api/manual'
import { kmeansAPI, type KMeansResult } from '@/api/kmeans'

interface Props {
  selectedImageId: number | null
  datasetId: number
  selectedImageIds?: number[]
}

type WindowType = 'original' | 'blurred' | 'kmeans-image' | 'kmeans-results'

interface WindowData {
  id: string
  type: WindowType
  title: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

interface PersistedWindowData {
  type: WindowType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

interface ClusterPixelStat {
  clusterIndex: number
  pixelCount: number
}

interface ClusterRow {
  clusterIndex: number
  color: [number, number, number] | null
  intensityCenter: string | null
  pixelCount: number | null
}

const props = defineProps<Props>()
const imageId = computed(() => props.selectedImageId)

const comboContainer = ref<HTMLElement | null>(null)
const windows = ref<WindowData[]>([])
const zCounter = ref(10)
const errorMessage = ref('')

const isLoadingOriginal = ref(false)
const isLoadingBlurred = ref(false)
const isKMeansLoading = ref(false)

const kmeansResult = ref<KMeansResult | null>(null)
const kmeansResultImageBase64 = ref<string | null>(null)
const pollingInterval = ref<number | null>(null)
const clusterPixelStats = ref<ClusterPixelStat[]>([])

const DEFAULT_KMEANS_CLUSTER_COUNT = 3
const WINDOW_LAYOUT_STORAGE_KEY = 'combo-window-layouts-v1'
const MIN_WINDOW_WIDTH = 320
const MIN_WINDOW_HEIGHT = 220
const WINDOW_DEFAULT_SIZES: Record<WindowType, { width: number; height: number }> = {
  original: { width: 640, height: 420 },
  blurred: { width: 640, height: 420 },
  'kmeans-image': { width: 700, height: 520 },
  'kmeans-results': { width: 620, height: 480 }
}
const WINDOW_TITLE_MAP: Record<WindowType, string> = {
  original: 'Оригинал',
  blurred: 'Размытое изображение',
  'kmeans-image': 'K-means изображение',
  'kmeans-results': 'K-means результаты'
}

const imageState = computed(() => {
  if (!imageId.value) {
    return {
      originalUrl: '',
      blurredUrl: ''
    }
  }
  const state = manualAnalysisAPI.getAnalysisState(imageId.value)
  return {
    originalUrl: state.originalImageBase64 || '',
    blurredUrl: state.blurredImageBase64 || ''
  }
})

const kmeansResultImageUrl = computed(() => kmeansResultImageBase64.value || '')

const kmeansColors = computed<Array<[number, number, number]>>(() => {
  if (!kmeansResult.value) {
    return []
  }
  return kmeansResult.value.result.colors_rgb || kmeansResult.value.result.colors || []
})

const kmeansCenters = computed<number[]>(() => {
  if (!kmeansResult.value?.result.centers_sorted) {
    return []
  }
  return kmeansResult.value.result.centers_sorted
})

const kmeansClusterRows = computed<ClusterRow[]>(() => {
  const maxCount = Math.max(kmeansColors.value.length, kmeansCenters.value.length, clusterPixelStats.value.length)
  const rows: ClusterRow[] = []

  for (let index = 0; index < maxCount; index += 1) {
    const clusterStat = clusterPixelStats.value.find((item) => item.clusterIndex === index)
    const intensityValue = kmeansCenters.value[index]

    rows.push({
      clusterIndex: index,
      color: kmeansColors.value[index] || null,
      intensityCenter: typeof intensityValue === 'number' ? intensityValue.toFixed(2) : null,
      pixelCount: clusterStat ? clusterStat.pixelCount : null
    })
  }

  return rows
})

const hasWindow = (type: WindowType): boolean => windows.value.some((win) => win.type === type)

const bringToFront = (windowId: string) => {
  const target = windows.value.find((win) => win.id === windowId)
  if (!target) {
    return
  }
  zCounter.value += 1
  target.zIndex = zCounter.value
}

const getWindowSize = (type: WindowType) => WINDOW_DEFAULT_SIZES[type]

const normalizeWindowSize = (width: number, height: number) => {
  return {
    width: Math.max(MIN_WINDOW_WIDTH, width),
    height: Math.max(MIN_WINDOW_HEIGHT, height)
  }
}

const isOverlapping = (
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
) => {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  )
}

const findFreePosition = (type: WindowType) => {
  const size = getWindowSize(type)
  const container = comboContainer.value

  if (!container) {
    const offset = windows.value.length * 26
    return { x: 20 + offset, y: 20 + offset }
  }

  const rect = container.getBoundingClientRect()
  const maxX = Math.max(12, rect.width - size.width - 12)
  const maxY = Math.max(12, rect.height - size.height - 12)
  const step = 30

  for (let y = 12; y <= maxY; y += step) {
    for (let x = 12; x <= maxX; x += step) {
      const candidate = { x, y, width: size.width, height: size.height }
      const collides = windows.value.some((existing) => isOverlapping(candidate, existing))
      if (!collides) {
        return { x, y }
      }
    }
  }

  const offset = windows.value.length * 24
  return {
    x: Math.min(12 + offset, maxX),
    y: Math.min(12 + offset, maxY)
  }
}

const addWindow = (type: WindowType) => {
  const baseSize = getWindowSize(type)
  const size = normalizeWindowSize(baseSize.width, baseSize.height)
  const position = findFreePosition(type)

  zCounter.value += 1

  windows.value.push({
    id: `${type}-window`,
    type,
    title: WINDOW_TITLE_MAP[type],
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    zIndex: zCounter.value
  })
}

const removeWindow = (type: WindowType) => {
  windows.value = windows.value.filter((win) => win.type !== type)
}

const formatCompactness = (value?: number) => {
  if (typeof value !== 'number') {
    return '-'
  }
  return value.toFixed(2)
}

const getStoredLayouts = (): Record<string, PersistedWindowData[]> => {
  const raw = localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY)
  if (!raw) {
    return {}
  }
  try {
    return JSON.parse(raw) as Record<string, PersistedWindowData[]>
  } catch {
    return {}
  }
}

const saveStoredLayouts = (layouts: Record<string, PersistedWindowData[]>) => {
  localStorage.setItem(WINDOW_LAYOUT_STORAGE_KEY, JSON.stringify(layouts))
}

const getGlobalLayout = (): PersistedWindowData[] => {
  const layouts = getStoredLayouts()
  return layouts.global || []
}

const saveGlobalLayout = (layout: PersistedWindowData[]) => {
  const layouts = getStoredLayouts()
  layouts.global = layout
  saveStoredLayouts(layouts)
}

const persistCurrentLayout = () => {
  const globalLayout = windows.value.map((windowItem) => ({
    type: windowItem.type,
    x: windowItem.x,
    y: windowItem.y,
    width: windowItem.width,
    height: windowItem.height,
    zIndex: windowItem.zIndex
  }))
  saveGlobalLayout(globalLayout)
}

const restoreLayoutForImage = (): WindowData[] => {
  const stored = getGlobalLayout()

  return stored.map((windowItem) => ({
    ...(() => {
      const normalized = normalizeWindowSize(windowItem.width, windowItem.height)
      return {
        id: `${windowItem.type}-window`,
        type: windowItem.type,
        title: WINDOW_TITLE_MAP[windowItem.type],
        x: windowItem.x,
        y: windowItem.y,
        width: normalized.width,
        height: normalized.height,
        zIndex: windowItem.zIndex
      }
    })()
  }))
}

const calculateClusterPixelStatsByImage = async (imageUrl: string, colors: Array<[number, number, number]>) => {
  if (!imageUrl || colors.length === 0) {
    clusterPixelStats.value = []
    return
  }

  const image = new Image()
  image.src = imageUrl

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Не удалось загрузить изображение K-means для расчета центроидов'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Не удалось получить canvas context')
  }

  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data

  const count = Array.from({ length: colors.length }, () => 0)

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const pixelIndex = (y * canvas.width + x) * 4
      const red = pixels[pixelIndex] ?? 0
      const green = pixels[pixelIndex + 1] ?? 0
      const blue = pixels[pixelIndex + 2] ?? 0
      const alpha = pixels[pixelIndex + 3] ?? 0

      if (alpha === 0) {
        continue
      }

      let nearestCluster = 0
      let minDistance = Number.POSITIVE_INFINITY

      for (let clusterIndex = 0; clusterIndex < colors.length; clusterIndex += 1) {
        const currentColor = colors[clusterIndex]
        if (!currentColor) {
          continue
        }

        const [clusterRed, clusterGreen, clusterBlue] = currentColor
        const dist =
          (red - clusterRed) * (red - clusterRed) +
          (green - clusterGreen) * (green - clusterGreen) +
          (blue - clusterBlue) * (blue - clusterBlue)

        if (dist < minDistance) {
          minDistance = dist
          nearestCluster = clusterIndex
        }
      }

      count[nearestCluster] = (count[nearestCluster] ?? 0) + 1
    }
  }

  const nextStats: ClusterPixelStat[] = []

  for (let clusterIndex = 0; clusterIndex < colors.length; clusterIndex += 1) {
    const clusterPixelCount = count[clusterIndex] ?? 0
    if (clusterPixelCount === 0) {
      continue
    }

    nextStats.push({
      clusterIndex,
      pixelCount: clusterPixelCount
    })
  }

  clusterPixelStats.value = nextStats
}

const ensureDataForActiveWindows = async () => {
  const activeTypes = new Set(windows.value.map((windowItem) => windowItem.type))

  if (activeTypes.has('original')) {
    await ensureOriginalLoaded()
  }

  if (activeTypes.has('blurred')) {
    await ensureBlurredLoaded()
  }

  if (activeTypes.has('kmeans-image') || activeTypes.has('kmeans-results')) {
    await ensureKMeansLoaded()
  }
}

const ensureOriginalLoaded = async () => {
  if (!imageId.value || imageState.value.originalUrl || isLoadingOriginal.value) {
    return
  }
  try {
    isLoadingOriginal.value = true
    errorMessage.value = ''
    await manualAnalysisAPI.loadOriginalImage(imageId.value)
  } catch (error) {
    errorMessage.value = `Ошибка загрузки оригинала: ${manualAnalysisAPI.formatError(error)}`
  } finally {
    isLoadingOriginal.value = false
  }
}

const ensureBlurredLoaded = async () => {
  if (!imageId.value || imageState.value.blurredUrl || isLoadingBlurred.value) {
    return
  }
  try {
    isLoadingBlurred.value = true
    errorMessage.value = ''
    await manualAnalysisAPI.getBlurredImage(imageId.value)
  } catch (error) {
    errorMessage.value = `Ошибка загрузки blur: ${manualAnalysisAPI.formatError(error)}`
  } finally {
    isLoadingBlurred.value = false
  }
}

const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

const startPollingForKMeans = () => {
  if (!imageId.value || pollingInterval.value) {
    return
  }

  pollingInterval.value = setInterval(async () => {
    if (!imageId.value) {
      stopPolling()
      return
    }

    try {
      const currentResult = await kmeansAPI.getResult(imageId.value)
      if (!currentResult) {
        return
      }

      kmeansResult.value = currentResult

      if (currentResult.status === 'completed') {
        stopPolling()
        isKMeansLoading.value = false
        kmeansResultImageBase64.value = await kmeansAPI.getResultImageBase64(imageId.value)
      }

      if (currentResult.status === 'failed') {
        stopPolling()
        isKMeansLoading.value = false
        errorMessage.value = `K-means завершился с ошибкой: ${currentResult.error || 'Неизвестная ошибка'}`
      }
    } catch (error) {
      errorMessage.value = `Ошибка поллинга K-means: ${kmeansAPI.formatError(error)}`
      stopPolling()
      isKMeansLoading.value = false
    }
  }, 2000)
}

const ensureKMeansLoaded = async () => {
  if (!imageId.value || isKMeansLoading.value) {
    return
  }

  try {
    isKMeansLoading.value = true
    errorMessage.value = ''

    const existingResult = await kmeansAPI.getResult(imageId.value)

    if (!existingResult) {
      const params = kmeansAPI.getDefaultParameters(DEFAULT_KMEANS_CLUSTER_COUNT)
      await kmeansAPI.runAnalysis(imageId.value, params)
      startPollingForKMeans()
      return
    }

    kmeansResult.value = existingResult

    if (existingResult.status === 'completed') {
      kmeansResultImageBase64.value = await kmeansAPI.getResultImageBase64(imageId.value)
      isKMeansLoading.value = false
      return
    }

    if (existingResult.status === 'processing') {
      startPollingForKMeans()
      return
    }

    isKMeansLoading.value = false
    errorMessage.value = `K-means недоступен: ${existingResult.error || 'Ошибка результата'}`
  } catch (error) {
    isKMeansLoading.value = false
    errorMessage.value = `Ошибка K-means: ${kmeansAPI.formatError(error)}`
  }
}

const toggleWindow = async (type: WindowType) => {
  if (!imageId.value) {
    return
  }

  if (hasWindow(type)) {
    removeWindow(type)
    return
  }

  addWindow(type)

  if (type === 'original') {
    await ensureOriginalLoaded()
    return
  }

  if (type === 'blurred') {
    await ensureBlurredLoaded()
    return
  }

  await ensureKMeansLoaded()
}

watch(
  [kmeansResultImageUrl, kmeansColors],
  async ([imageUrl, colors]) => {
    if (!imageUrl || colors.length === 0) {
      clusterPixelStats.value = []
      return
    }

    try {
      await calculateClusterPixelStatsByImage(imageUrl, colors)
    } catch (error) {
      clusterPixelStats.value = []
      errorMessage.value = error instanceof Error ? error.message : 'Ошибка расчета статистики кластеров'
    }
  },
  { immediate: true }
)

watch(
  windows,
  () => {
    persistCurrentLayout()
  },
  { deep: true }
)

watch(
  () => props.selectedImageId,
  async (newImageId) => {
    stopPolling()
    errorMessage.value = ''
    kmeansResult.value = null
    kmeansResultImageBase64.value = null
    clusterPixelStats.value = []

    if (!newImageId) {
      windows.value = restoreLayoutForImage()
      zCounter.value = Math.max(10, ...windows.value.map((windowItem) => windowItem.zIndex))
      return
    }

    windows.value = restoreLayoutForImage()
    zCounter.value = Math.max(10, ...windows.value.map((windowItem) => windowItem.zIndex))
    await ensureDataForActiveWindows()
  },
  { immediate: true }
)

onUnmounted(() => {
  persistCurrentLayout()
  stopPolling()
})
</script>

<style scoped>
.combo-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toggle-btn {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color-primary);
  color: var(--text-color);
  cursor: pointer;
}

.toggle-btn.active {
  border-color: var(--primary-color);
  background: rgba(63, 81, 181, 0.12);
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.canvas {
  position: relative;
  flex: 1;
  min-height: 620px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-color-secondary);
  overflow: hidden;
}

.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
}

.floating-window {
  border: 1px solid var(--border-color);
  background: var(--bg-color-primary);
  border-radius: 8px;
  overflow: hidden;
}

.window-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.window-header {
  height: 36px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color-secondary);
  font-weight: 600;
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  padding: 4px;
}

.window-content {
  flex: 1;
  min-height: 0;
  background: var(--bg-color-primary);
}

.content-hint {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  text-align: center;
  padding: 12px;
}

.content-hint.small {
  height: auto;
  justify-content: flex-start;
  padding: 0;
}

.kmeans-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.kmeans-stats {
  border-top: 1px solid var(--border-color);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 210px;
  overflow: auto;
}

.kmeans-stats.full-height {
  border-top: none;
  height: 100%;
  max-height: none;
}

.kmeans-stats h4 {
  margin: 0;
}

.stats-grid {
  display: grid;
  gap: 4px;
}

.color-list {
  display: grid;
  gap: 6px;
}

.color-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.cluster-row {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px;
}

.cluster-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.color-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid var(--border-color);
  flex: 0 0 14px;
}

.error-banner {
  color: #9f2c2c;
  background: #ffe9e9;
  border: 1px solid #f0c4c4;
  border-radius: 6px;
  padding: 8px 10px;
}
</style>