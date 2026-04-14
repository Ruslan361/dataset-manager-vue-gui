<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore, type ThemeKey } from '@/stores/theme'
import Button from '@/components/common/Button.vue'

const themeStore = useThemeStore()

// Группы переменных для отображения
interface VarItem {
  key: ThemeKey
  label: string
  type: 'color' | 'size'
}

const brandVars: VarItem[] = [
  { key: '--primary-color',   label: 'Основной',    type: 'color' },
  { key: '--secondary-color', label: 'Вторичный',   type: 'color' },
  { key: '--accent-color',    label: 'Акцент',      type: 'color' },
]

const stateVars: VarItem[] = [
  { key: '--success-color', label: 'Успех',       type: 'color' },
  { key: '--warning-color', label: 'Предупреждение', type: 'color' },
  { key: '--error-color',   label: 'Ошибка',      type: 'color' },
]

const surfaceVars: VarItem[] = [
  { key: '--bg-color',           label: 'Фон основной',    type: 'color' },
  { key: '--bg-color-secondary', label: 'Фон вторичный',   type: 'color' },
  { key: '--bg-color-accent',    label: 'Фон акцент',      type: 'color' },
  { key: '--text-color',         label: 'Текст основной',  type: 'color' },
  { key: '--text-color-secondary', label: 'Текст вторичный', type: 'color' },
  { key: '--border-color',       label: 'Граница',         type: 'color' },
]

const shapeVars: VarItem[] = [
  { key: '--border-radius',       label: 'Скругление (обычное)', type: 'size' },
  { key: '--border-radius-large', label: 'Скругление (большое)', type: 'size' },
]

const hasOverrides = computed(() => Object.keys(themeStore.overrides).length > 0)

function onColorInput(key: ThemeKey, event: Event) {
  themeStore.setVar(key, (event.target as HTMLInputElement).value)
}

function onSizeInput(key: ThemeKey, event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  // Допускаем числа (трактуем как px) и строки с единицами
  const value = /^\d+$/.test(raw) ? `${raw}px` : raw
  themeStore.setVar(key, value)
}

function getSizeValue(key: ThemeKey): string {
  return themeStore.getVar(key).replace('px', '')
}
</script>

<template>
  <div class="theme-settings">
    <div class="theme-header">
      <p class="theme-hint">Изменения применяются сразу и сохраняются между сессиями.</p>
      <Button v-if="hasOverrides" variant="error" size="small" @click="themeStore.reset()">
        Сбросить к умолчаниям
      </Button>
    </div>

    <div class="theme-groups">
      <section class="theme-group">
        <h4 class="group-title">Основные цвета</h4>
        <div class="var-list">
          <div v-for="item in brandVars" :key="item.key" class="var-row">
            <label class="var-label">{{ item.label }}</label>
            <div class="var-controls">
              <input
                type="color"
                class="color-picker"
                :value="themeStore.getVar(item.key)"
                @input="onColorInput(item.key, $event)"
              />
              <span class="var-value">{{ themeStore.getVar(item.key) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="theme-group">
        <h4 class="group-title">Цвета состояний</h4>
        <div class="var-list">
          <div v-for="item in stateVars" :key="item.key" class="var-row">
            <label class="var-label">{{ item.label }}</label>
            <div class="var-controls">
              <input
                type="color"
                class="color-picker"
                :value="themeStore.getVar(item.key)"
                @input="onColorInput(item.key, $event)"
              />
              <span class="var-value">{{ themeStore.getVar(item.key) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="theme-group">
        <h4 class="group-title">Поверхности и текст</h4>
        <div class="var-list">
          <div v-for="item in surfaceVars" :key="item.key" class="var-row">
            <label class="var-label">{{ item.label }}</label>
            <div class="var-controls">
              <input
                type="color"
                class="color-picker"
                :value="themeStore.getVar(item.key)"
                @input="onColorInput(item.key, $event)"
              />
              <span class="var-value">{{ themeStore.getVar(item.key) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="theme-group">
        <h4 class="group-title">Геометрия</h4>
        <div class="var-list">
          <div v-for="item in shapeVars" :key="item.key" class="var-row">
            <label class="var-label">{{ item.label }}</label>
            <div class="var-controls">
              <input
                type="range"
                class="size-range"
                min="0"
                max="24"
                :value="getSizeValue(item.key)"
                @input="onSizeInput(item.key, $event)"
              />
              <span class="var-value">{{ themeStore.getVar(item.key) }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.theme-settings {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.theme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.theme-hint {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  margin: 0;
}

.theme-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.theme-group {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.group-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 var(--spacing-xs);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--border-color);
}

.var-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.var-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.var-label {
  font-size: var(--font-size-sm);
  color: var(--text-color);
  flex: 1;
  min-width: 0;
}

.var-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.color-picker {
  width: 36px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-small);
  background: var(--bg-color);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.color-picker:hover {
  border-color: var(--border-color-hover);
}

.size-range {
  width: 100px;
  accent-color: var(--primary-color);
  cursor: pointer;
}

.var-value {
  font-size: var(--font-size-xs);
  color: var(--text-color-muted);
  font-family: var(--font-family-mono);
  min-width: 56px;
  text-align: right;
}
</style>
