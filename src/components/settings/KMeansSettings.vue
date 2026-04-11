<script lang="js">
import { computed, watch } from 'vue'
import { useKMeansStore } from '@/stores/kmeans'

export default {
  setup() {
    const kmeansStore = useKMeansStore()

    const localClusters = computed({
      get: () => kmeansStore.getParameters.nclusters,
      set: (value) => {
        kmeansStore.setParameters({ ...kmeansStore.getParameters, nclusters: value })
      }
    })

    const localMaxIterations = computed({
      get: () => kmeansStore.getParameters.max_iterations,
      set: (value) => {
        kmeansStore.setParameters({ ...kmeansStore.getParameters, max_iterations: value })
      }
    })

    const localAttempts = computed({
      get: () => kmeansStore.getParameters.attempts,
      set: (value) => {
        kmeansStore.setParameters({ ...kmeansStore.getParameters, attempts: value })
      }
    })

    const localEpsilon = computed({
      get: () => kmeansStore.getParameters.epsilon,
      set: (value) => {
        kmeansStore.setParameters({ ...kmeansStore.getParameters, epsilon: value })
      }
    })

    const localCriteria = computed({
      get: () => kmeansStore.getParameters.criteria,
      set: (value) => {
        kmeansStore.setParameters({ ...kmeansStore.getParameters, criteria: value })
      }
    })

    const localFlags = computed({
      get: () => kmeansStore.getParameters.flags,
      set: (value) => {
        kmeansStore.setParameters({ ...kmeansStore.getParameters, flags: value })
      }
    })

    const localColors = computed({
      get: () => kmeansStore.getParameters.colors,
      set: (value) => {
        kmeansStore.setParameters({ ...kmeansStore.getParameters, colors: value })
      }
    })

    const isProcessing = false

    const clampColorChannel = (value) => {
      const numberValue = Number(value)
      if (!Number.isFinite(numberValue)) return 0
      return Math.max(0, Math.min(255, Math.round(numberValue)))
    }

    const normalizeColorsCount = (clustersCount) => {
      const targetCount = Math.max(2, Number(clustersCount) || 2)
      const nextColors = localColors.value.map((color) => [
        clampColorChannel(color[0]),
        clampColorChannel(color[1]),
        clampColorChannel(color[2])
      ])

      while (nextColors.length < targetCount) {
        nextColors.push([0, 0, 0])
      }

      if (nextColors.length > targetCount) {
        nextColors.length = targetCount
      }

      localColors.value = nextColors
    }

    const setClusterColor = (clusterIndex, channelIndex, value) => {
      const normalizedValue = clampColorChannel(value)
      const nextColors = localColors.value.map((color) => [
        clampColorChannel(color[0]),
        clampColorChannel(color[1]),
        clampColorChannel(color[2])
      ])

      if (!nextColors[clusterIndex]) {
        nextColors[clusterIndex] = [0, 0, 0]
      }

      nextColors[clusterIndex][channelIndex] = normalizedValue
      localColors.value = nextColors
    }

    const rgbToCss = (color) => {
      const red = clampColorChannel(color?.[0])
      const green = clampColorChannel(color?.[1])
      const blue = clampColorChannel(color?.[2])
      return `rgb(${red}, ${green}, ${blue})`
    }

    watch(localClusters, (value) => {
      normalizeColorsCount(value)
    }, { immediate: true })

    return {
      localClusters,
      localMaxIterations,
      localAttempts,
      localEpsilon,
      localCriteria,
      localFlags,
      localColors,
      isProcessing,
      setClusterColor,
      rgbToCss
    }
  }
}
</script>
<template>
    <div class="kmeans-parameters">
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

        <!-- Цвета кластеров -->
        <div class="params-section">
          <div class="colors-header">
            <h6 class="section-subtitle">Цвета кластеров ({{ localClusters }})</h6>
          </div>
          
          <div class="colors-grid">
            <div
              v-for="(color, index) in localColors"
              :key="`cluster-${index}`"
              class="color-item"
            >
              <div class="color-item-header">
                <label class="color-label">Кластер {{ index + 1 }}</label>
                <div class="color-controls">
                  <div
                    class="color-preview"
                    :style="{ backgroundColor: rgbToCss(color) }"
                  ></div>
                </div>
              </div>

              <div class="rgb-inputs">
                <label class="rgb-field">
                  R
                  <input
                    class="rgb-input"
                    type="number"
                    min="0"
                    max="255"
                    :value="color[0]"
                    :disabled="isProcessing"
                    @input="setClusterColor(index, 0, $event.target.value)"
                  />
                </label>
                <label class="rgb-field">
                  G
                  <input
                    class="rgb-input"
                    type="number"
                    min="0"
                    max="255"
                    :value="color[1]"
                    :disabled="isProcessing"
                    @input="setClusterColor(index, 1, $event.target.value)"
                  />
                </label>
                <label class="rgb-field">
                  B
                  <input
                    class="rgb-input"
                    type="number"
                    min="0"
                    max="255"
                    :value="color[2]"
                    :disabled="isProcessing"
                    @input="setClusterColor(index, 2, $event.target.value)"
                  />
                </label>
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
  transition: all 0.3s ease;
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
  transform: translateY(-1px);
}

.param-input:disabled,
.param-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--bg-color-accent);
}

/* Информационное сообщение */
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

/* Секция Цвета */
.colors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.colors-controls-header {
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
  transition: border-color 0.2s ease;
}

.color-item-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
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

.rgb-inputs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xs);
}

.rgb-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
}

.rgb-input {
  width: 100%;
  padding: var(--spacing-xs);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-small);
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: var(--font-size-xs);
}

.rgb-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

/* Новые стили для превью цвета (взамен старого input) */
.color-preview {
  width: 40px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
}

.color-preview:hover {
  border-color: var(--primary-color, #4a90e2);
}

.color-rgb {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: var(--bg-color-accent);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-small);
}

/* Кнопки управления */
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
  
  .color-preview {
    width: 60px;
    height: 35px;
  }
  
  .info-text {
    flex-direction: column;
    align-items: flex-start;
  }
}

.params-section:has(.control-button:disabled) {
  opacity: 0.7;
}

.color-item:has(.color-preview.is-disabled) {
  opacity: 0.8;
}

.parameters-header:hover .parameters-toggle {
  transform: scale(1.1);
}
</style>