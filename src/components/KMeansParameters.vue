<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Button from '@/components/Button.vue'

interface Props {
  clusters: number
  maxIterations: number
  attempts: number
  criteria: string
  flags: string
  epsilon: number
  colors: Array<[number, number, number]>
  isProcessing: boolean
  isExpanded: boolean
}

interface Emits {
  'update:clusters': [value: number]
  'update:maxIterations': [value: number]
  'update:attempts': [value: number]
  'update:criteria': [value: string]
  'update:flags': [value: string]
  'update:epsilon': [value: number]
  'update:colors': [value: Array<[number, number, number]>]
  'update:isExpanded': [value: boolean]
  'runAnalysis': []
  'resetAnalysis': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Локальные значения для v-model
const localClusters = ref(props.clusters)
const localMaxIterations = ref(props.maxIterations)
const localAttempts = ref(props.attempts)
const localCriteria = ref(props.criteria)
const localFlags = ref(props.flags)
const localEpsilon = ref(props.epsilon)
const localColors = ref([...props.colors])

// Флаг для предотвращения рекурсии
const isUpdatingFromProps = ref(false)

// Синхронизация с родительским компонентом (только если изменение пришло извне)
watch(() => props.clusters, (newVal) => {
  if (!isUpdatingFromProps.value && newVal !== localClusters.value) {
    isUpdatingFromProps.value = true
    localClusters.value = newVal
    updateColorsForClusterCount(newVal)
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  }
})

watch(() => props.maxIterations, (newVal) => {
  if (!isUpdatingFromProps.value) {
    localMaxIterations.value = newVal
  }
})

watch(() => props.attempts, (newVal) => {
  if (!isUpdatingFromProps.value) {
    localAttempts.value = newVal
  }
})

watch(() => props.criteria, (newVal) => {
  if (!isUpdatingFromProps.value) {
    localCriteria.value = newVal
  }
})

watch(() => props.flags, (newVal) => {
  if (!isUpdatingFromProps.value) {
    localFlags.value = newVal
  }
})

watch(() => props.epsilon, (newVal) => {
  if (!isUpdatingFromProps.value) {
    localEpsilon.value = newVal
  }
})

watch(() => props.colors, (newVal) => {
  if (!isUpdatingFromProps.value) {
    localColors.value = [...newVal]
  }
}, { deep: true })

// Обновление родительского компонента (только если изменение локальное)
watch(localClusters, (newVal, oldVal) => {
  if (!isUpdatingFromProps.value && newVal !== oldVal) {
    emit('update:clusters', newVal)
    updateColorsForClusterCount(newVal)
  }
})

watch(localMaxIterations, (newVal) => {
  if (!isUpdatingFromProps.value) {
    emit('update:maxIterations', newVal)
  }
})

watch(localAttempts, (newVal) => {
  if (!isUpdatingFromProps.value) {
    emit('update:attempts', newVal)
  }
})

watch(localCriteria, (newVal) => {
  if (!isUpdatingFromProps.value) {
    emit('update:criteria', newVal)
  }
})

watch(localFlags, (newVal) => {
  if (!isUpdatingFromProps.value) {
    emit('update:flags', newVal)
  }
})

watch(localEpsilon, (newVal) => {
  if (!isUpdatingFromProps.value) {
    emit('update:epsilon', newVal)
  }
})

watch(localColors, (newVal) => {
  if (!isUpdatingFromProps.value) {
    emit('update:colors', [...newVal])
  }
}, { deep: true })

// Функция для обновления цветов при изменении количества кластеров
const updateColorsForClusterCount = (newClusters: number) => {
  const currentColors = [...localColors.value]
  const newColors: Array<[number, number, number]> = []
  
  for (let i = 0; i < newClusters; i++) {
    if (i < currentColors.length && currentColors[i]) {
      // Сохраняем существующий цвет
      newColors.push(currentColors[i]!)
    } else {
      // Генерируем новый цвет для нового кластера
      const newColor = generateColorForCluster(i, newClusters, newColors)
      newColors.push(newColor)
    }
  }
  
  localColors.value = newColors
}

// Функция для генерации цвета для кластера
const generateColorForCluster = (
  index: number, 
  totalClusters: number, 
  existingColors: Array<[number, number, number]>
): [number, number, number] => {
  // Базовое распределение по цветовому кругу
  const baseHue = (index * 360) / totalClusters
  
  // Добавляем небольшое смещение для разнообразия
  const hueOffset = (index % 3) * 15 // 0, 15, 30 градусов
  const hue = (baseHue + hueOffset) % 360
  
  // Варьируем насыщенность и яркость для лучшего различия
  const saturation = 60 + (index % 3) * 10  // 60%, 70%, 80%
  const lightness = 45 + (index % 2) * 10   // 45%, 55%
  
  const rgb = hslToRgb(hue, saturation, lightness)
  return [rgb.r, rgb.g, rgb.b]
}

const toggleExpanded = () => {
  emit('update:isExpanded', !props.isExpanded)
}

const updateColor = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const hex = target.value
  const rgb = hexToRgb(hex)
  if (rgb) {
    const newColors = [...localColors.value]
    newColors[index] = [rgb.r, rgb.g, rgb.b]
    localColors.value = newColors
  }
}

// Дополнительные функции для управления цветами
const resetColorsToDefault = () => {
  const newColors: Array<[number, number, number]> = []
  
  for (let i = 0; i < localClusters.value; i++) {
    const newColor = generateColorForCluster(i, localClusters.value, [])
    newColors.push(newColor)
  }
  
  localColors.value = newColors
}

const randomizeColors = () => {
  const newColors: Array<[number, number, number]> = []
  
  for (let i = 0; i < localClusters.value; i++) {
    const hue = Math.random() * 360
    const saturation = 50 + Math.random() * 40 // 50-90%
    const lightness = 40 + Math.random() * 30  // 40-70%
    
    const rgb = hslToRgb(hue, saturation, lightness)
    newColors.push([rgb.r, rgb.g, rgb.b])
  }
  
  localColors.value = newColors
}

// Утилитарные функции
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100
  l /= 100
  
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  
  let r = 0, g = 0, b = 0
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result && result[1] && result[2] && result[3] ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}
</script>

<template>
  <div class="kmeans-parameters">
    <div class="parameters-header" @click="toggleExpanded">
      <h5 class="parameters-title">Параметры анализа</h5>
      <span class="parameters-toggle">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
    </div>
    
    <div v-show="isExpanded" class="parameters-content">
      <div class="parameters-scroll">
        <!-- Основные параметры -->
        <div class="params-section">
          <h6 class="section-subtitle">Основные параметры</h6>
          
          <div class="param-group">
            <label class="param-label" for="clusters">
              Количество кластеров:
            </label>
            <input
              id="clusters"
              v-model.number="localClusters"
              type="number"
              min="2"
              max="10"
              class="param-input"
              :disabled="isProcessing"
            />
          </div>
          
          <div class="param-group">
            <label class="param-label" for="iterations">
              Максимум итераций:
            </label>
            <input
              id="iterations"
              v-model.number="localMaxIterations"
              type="number"
              min="10"
              max="500"
              class="param-input"
              :disabled="isProcessing"
            />
          </div>
          
          <div class="param-group">
            <label class="param-label" for="attempts">
              Попытки:
            </label>
            <input
              id="attempts"
              v-model.number="localAttempts"
              type="number"
              min="1"
              max="10"
              class="param-input"
              :disabled="isProcessing"
            />
          </div>

          <div class="param-group">
            <label class="param-label" for="epsilon">
              Точность (ε):
            </label>
            <input
              id="epsilon"
              v-model.number="localEpsilon"
              type="number"
              min="0.01"
              max="10"
              step="0.01"
              class="param-input"
              :disabled="isProcessing"
            />
          </div>
        </div>

        <!-- Алгоритмические параметры -->
        <div class="params-section">
          <h6 class="section-subtitle">Алгоритм</h6>
          
          <div class="param-group">
            <label class="param-label" for="criteria">
              Критерий остановки:
            </label>
            <select
              id="criteria"
              v-model="localCriteria"
              class="param-select"
              :disabled="isProcessing"
            >
              <option value="epsilon">По точности (ε)</option>
              <option value="max iterations">По итерациям</option>
              <option value="all">Оба критерия</option>
            </select>
          </div>
          
          <div class="param-group">
            <label class="param-label" for="flags">
              Инициализация:
            </label>
            <select
              id="flags"
              v-model="localFlags"
              class="param-select"
              :disabled="isProcessing"
            >
              <option value="pp">K-means++</option>
              <option value="random">Случайная</option>
            </select>
          </div>

          <div v-if="localCriteria === 'epsilon' || localCriteria === 'all'" class="param-info">
            <div class="info-text">
              <span class="info-icon">ℹ️</span>
              <span class="info-message">
                Алгоритм остановится, когда точность достигнет {{ localEpsilon }} или меньше
              </span>
            </div>
          </div>
        </div>

        <!-- Цвета кластеров -->
        <div class="params-section">
          <div class="colors-header">
            <h6 class="section-subtitle">Цвета кластеров ({{ localClusters }})</h6>
            <div class="colors-controls">
              <button
                @click="resetColorsToDefault"
                class="colors-control-btn"
                :disabled="isProcessing"
                title="Сбросить цвета по умолчанию"
              >
                🎨
              </button>
              <button
                @click="randomizeColors"
                class="colors-control-btn"
                :disabled="isProcessing"
                title="Случайные цвета"
              >
                🎲
              </button>
            </div>
          </div>
          
          <div class="colors-grid">
            <div
              v-for="(color, index) in localColors"
              :key="`cluster-${index}`"
              class="color-item"
            >
              <label class="color-label">Кластер {{ index + 1 }}</label>
              <div class="color-controls">
                <input
                  type="color"
                  :value="rgbToHex(color[0], color[1], color[2])"
                  @input="updateColor(index, $event)"
                  class="color-picker"
                  :disabled="isProcessing"
                />
                <span class="color-rgb">
                  RGB({{ color[0] }}, {{ color[1] }}, {{ color[2] }})
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Кнопки управления -->
        <div class="params-section">
          <div class="analysis-controls">
            <Button
              variant="primary"
              size="medium"
              @click="$emit('runAnalysis')"
              :disabled="isProcessing"
              class="control-button"
            >
              <span v-if="isProcessing">
                <span class="spinner"></span>
                Анализируем...
              </span>
              <span v-else>
                🎯 Запустить анализ
              </span>
            </Button>
            
            <Button
              variant="secondary"
              size="medium"
              @click="$emit('resetAnalysis')"
              :disabled="isProcessing"
              class="control-button"
            >
              🔄 Сбросить
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kmeans-parameters {
  background-color: var(--bg-color-secondary);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  overflow: hidden;
  flex-shrink: 0;
}

.parameters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;
}

.parameters-header:hover {
  background-color: var(--bg-color-accent);
}

.parameters-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.parameters-toggle {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  transition: transform 0.2s ease;
}

.parameters-content {
  border-top: 1px solid var(--border-color);
}

.parameters-scroll {
  max-height: 500px;
  overflow-y: auto;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* Кастомный скроллбар */
.parameters-scroll::-webkit-scrollbar {
  width: 6px;
}

.parameters-scroll::-webkit-scrollbar-track {
  background: var(--bg-color-secondary);
  border-radius: 3px;
}

.parameters-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color-hover);
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.parameters-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary);
}

/* Firefox */
.parameters-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--border-color-hover) var(--bg-color-secondary);
}

.params-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.section-subtitle {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--border-color);
}

.param-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
}

.param-label {
  font-size: var(--font-size-sm);
  color: var(--text-color);
  font-weight: 500;
  flex: 1;
}

.param-input,
.param-select {
  width: 120px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: var(--font-size-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.param-input:focus,
.param-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.param-input:disabled,
.param-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--bg-color-accent);
}

/* Информационное сообщение для epsilon */
.param-info {
  margin-top: var(--spacing-xs);
}

.info-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--bg-color-accent);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.info-icon {
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.info-message {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
  line-height: 1.4;
}

/* Цвета */
.colors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.colors-controls {
  display: flex;
  gap: var(--spacing-xs);
}

.colors-control-btn {
  padding: var(--spacing-xs);
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all 0.2s ease;
}

.colors-control-btn:hover:not(:disabled) {
  background-color: var(--bg-color-accent);
  border-color: var(--border-color-hover);
}

.colors-control-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.colors-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.color-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background-color: var(--bg-color);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.color-label {
  font-size: var(--font-size-xs);
  color: var(--text-color);
  font-weight: 500;
}

.color-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.color-picker {
  width: 40px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.color-picker:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.color-rgb {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: var(--bg-color-accent);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-small);
}

.analysis-controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.control-button {
  width: 100%;
  justify-content: center;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: var(--spacing-xs);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Адаптивность */
@media (max-width: 768px) {
  .parameters-scroll {
    max-height: 400px;
  }
  
  .param-group {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .param-input,
  .param-select {
    width: 100%;
  }
  
  .colors-grid {
    gap: var(--spacing-xs);
  }
  
  .color-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .color-picker {
    width: 60px;
    height: 35px;
  }
  
  .info-text {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Состояния загрузки */
.params-section:has(.control-button:disabled) {
  opacity: 0.7;
}

.color-item:has(.color-picker:disabled) {
  opacity: 0.8;
}

/* Улучшенная анимация */
.parameters-content {
  transition: all 0.3s ease;
}

.parameters-toggle {
  transition: transform 0.2s ease;
}

.parameters-header:hover .parameters-toggle {
  transform: scale(1.1);
}

/* Улучшенные фокус состояния */
.param-input:focus,
.param-select:focus {
  transform: translateY(-1px);
}

.color-picker:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
</style>