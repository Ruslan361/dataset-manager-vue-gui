<template>
  <div class="interactive-image-container">
    <div class="image-header">
      <slot name="header">
        <p>Изображение с линиями</p>
      </slot>
    </div>
    
    <div 
      class="interactive-wrapper" 
      ref="interactiveImageContainer"
      @contextmenu.prevent="handleContextMenu"
    >
      <!-- ИСПРАВЛЕНО: Контейнер для изображения и линий -->
      <div class="image-and-lines-container" ref="imageContainer">
        <img 
          ref="imageElement"
          :src="imageUrl" 
          :alt="imageAlt"
          @load="onImageLoad"
          @contextmenu.prevent
          class="responsive-image"
        />
        
        <!-- ИСПРАВЛЕНО: Контейнер для линий, привязанный к изображению -->
        <div class="lines-overlay" ref="linesContainer">
          <!-- ИЗМЕНЕНО: Работаем напрямую с props.linesState -->
          <div
            v-for="line in linesState.horizontal"
            :key="line.id"
            class="line horizontal-line"
            :style="{ top: (line.relativeY * 100) + '%' }"
            @mousedown="startDrag($event, line, 'y')"
            @contextmenu.prevent.stop="handleLineContextMenu($event, line)"
          ></div>
          
          <!-- Вертикальные линии с относительными координатами -->
          <div
            v-for="line in linesState.vertical"
            :key="line.id"
            class="line vertical-line"
            :style="{ left: (line.relativeX * 100) + '%' }"
            @mousedown="startDrag($event, line, 'x')"
            @contextmenu.prevent.stop="handleLineContextMenu($event, line)"
          ></div>
        </div>
      </div>
    </div>

    <!-- Контекстное меню -->
    <div 
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ 
        left: contextMenu.x + 'px', 
        top: contextMenu.y + 'px' 
      }"
      @click.stop
    >
      <div v-if="contextMenu.type === 'empty'">
        <button 
          class="menu-item"
          @click="addLine('horizontal')"
        >
          ➕ Добавить горизонтальную линию
        </button>
        <button 
          class="menu-item"
          @click="addLine('vertical')"
        >
          ➕ Добавить вертикальную линию
        </button>
      </div>
      
      <div v-else-if="contextMenu.type === 'line'">
        <button 
          class="menu-item delete"
          @click="deleteLine(contextMenu.lineId!)"
        >
          🗑️ Удалить линию
        </button>
      </div>
      
      <div v-else-if="contextMenu.type === 'intersection'">
        <div class="menu-header">Удалить линию:</div>
        <button 
          v-for="lineId in contextMenu.intersectionLines"
          :key="lineId"
          class="menu-item delete"
          @click="deleteLine(lineId)"
        >
          🗑️ {{ getLineDescription(lineId) }}
        </button>
      </div>
    </div>

    <!-- Overlay для закрытия меню -->
    <div 
      v-if="contextMenu.visible"
      class="context-overlay"
      @click="closeContextMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, type PropType } from 'vue'

// Изменено: храним относительные координаты (0-1) вместо абсолютных пикселей
interface Line {
  id: string
  relativeX: number // от 0 до 1
  relativeY: number // от 0 до 1
}

// ИЗМЕНЕНО: Определяем тип для всего объекта состояния
interface LinesState {
  horizontal: Line[]
  vertical: Line[]
  // Добавляем остальные поля, если они нужны дочернему компоненту
}

interface Props {
  imageUrl: string
  imageAlt?: string
  initialHorizontalLines?: Line[]
  initialVerticalLines?: Line[]
}

// ИЗМЕНЕНО: Принимаем один реактивный объект linesState
const props = defineProps({
  imageUrl: { type: String, required: true },
  imageAlt: { type: String, default: 'Interactive image' },
  linesState: { type: Object as PropType<LinesState>, required: true }
})

// emit больше не нужен, так как мы мутируем props напрямую
// const emit = defineEmits(['lines-changed'])

// --- REFS AND STATE ---
// Внутреннее состояние для линий больше не нужно
// const horizontalLines = ref<Line[]>([])
// const verticalLines = ref<Line[]>([])
const interactiveImageContainer = ref<HTMLElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const imageContainer = ref<HTMLElement | null>(null)
const linesContainer = ref<HTMLElement | null>(null)
const draggedLine = ref<{ line: Line; axis: 'x' | 'y' } | null>(null)

// Контекстное меню
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: '' as 'empty' | 'line' | 'intersection',
  lineId: null as string | null,
  intersectionLines: [] as string[]
})

// --- УДАЛЕНЫ ВСЕ WATCHERS И ФУНКЦИИ ИНИЦИАЛИЗАЦИИ ---
// watch, onImageLoad, initializeLinesFromProps, emitLinesChanged - больше не нужны

const onImageLoad = () => {
  console.log('Interactive image loaded. Lines are managed by parent.')
}

// ИСПРАВЛЕНО: Упрощенная обработка перетаскивания с процентными координатами
const startDrag = (event: MouseEvent, line: Line, axis: 'x' | 'y') => {
  event.preventDefault()
  event.stopPropagation()
  
  draggedLine.value = { line, axis }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
  
  console.log(`Start dragging ${axis} line:`, line)
}

const onDrag = (event: MouseEvent) => {
  if (!draggedLine.value || !imageContainer.value) return

  // ИСПРАВЛЕНО: Получаем координаты относительно контейнера изображения
  const containerRect = imageContainer.value.getBoundingClientRect()
  const { line, axis } = draggedLine.value

  if (axis === 'x') {
    // Вертикальная линия (движется по X)
    const pixelX = event.clientX - containerRect.left
    const relativeX = Math.max(0, Math.min(1, pixelX / containerRect.width))
    
    // ИЗМЕНЕНО: Мутируем prop напрямую
    line.relativeX = relativeX
    console.log(`Dragging vertical line - Relative X: ${relativeX.toFixed(3)}`)
  } else {
    // Горизонтальная линия (движется по Y)
    const pixelY = event.clientY - containerRect.top
    const relativeY = Math.max(0, Math.min(1, pixelY / containerRect.height))
    
    // ИЗМЕНЕНО: Мутируем prop напрямую
    line.relativeY = relativeY
    console.log(`Dragging horizontal line - Relative Y: ${relativeY.toFixed(3)}`)
  }
}

const endDrag = () => {
  if (draggedLine.value) {
    console.log('Drag ended, emitting lines changed')
  }
  draggedLine.value = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
}

// ИСПРАВЛЕНО: Упрощенная обработка контекстного меню
const handleContextMenu = (event: MouseEvent) => {
  if (!imageContainer.value) return
  
  event.preventDefault()
  
  // ИСПРАВЛЕНО: Получаем координаты относительно контейнера изображения
  const containerRect = imageContainer.value.getBoundingClientRect()
  const x = event.clientX - containerRect.left
  const y = event.clientY - containerRect.top
  
  // Проверяем, что клик был внутри изображения
  if (x < 0 || x > containerRect.width || y < 0 || y > containerRect.height) {
    console.log('Click outside image bounds')
    return
  }
  
  // Сохраняем относительные координаты
  const relativeX = x / containerRect.width
  const relativeY = y / containerRect.height
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'empty',
    lineId: null,
    intersectionLines: []
  }
  
  // Сохраняем координаты для добавления линий
  ;(contextMenu.value as any).relativeX = relativeX
  ;(contextMenu.value as any).relativeY = relativeY
  
  console.log(`Context menu at relative coordinates: X=${relativeX.toFixed(3)}, Y=${relativeY.toFixed(3)}`)
}

const addLine = (type: 'horizontal' | 'vertical') => {
  const savedRelativeX = (contextMenu.value as any).relativeX || 0.5
  const savedRelativeY = (contextMenu.value as any).relativeY || 0.5
  
  if (type === 'horizontal') {
    const newLine: Line = {
      id: generateLineId('h'),
      relativeX: 0,
      relativeY: Math.max(0.01, Math.min(0.99, savedRelativeY))
    }
    // ИЗМЕНЕНО: Мутируем prop напрямую
    props.linesState.horizontal.push(newLine)
    console.log(`Added horizontal line at relative Y: ${newLine.relativeY.toFixed(3)}`)
  } else {
    const newLine: Line = {
      id: generateLineId('v'),
      relativeX: Math.max(0.01, Math.min(0.99, savedRelativeX)),
      relativeY: 0
    }
    // ИЗМЕНЕНО: Мутируем prop напрямую
    props.linesState.vertical.push(newLine)
    console.log(`Added vertical line at relative X: ${newLine.relativeX.toFixed(3)}`)
  }
  
  closeContextMenu()
}

const handleLineContextMenu = (event: MouseEvent, line: Line) => {
  event.preventDefault()
  event.stopPropagation()
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'line',
    lineId: line.id,
    intersectionLines: []
  }
}

const deleteLine = (lineId: string) => {
  // ИЗМЕНЕНО: Мутируем prop напрямую
  props.linesState.horizontal = props.linesState.horizontal.filter(line => line.id !== lineId)
  props.linesState.vertical = props.linesState.vertical.filter(line => line.id !== lineId)
  console.log(`Deleted line: ${lineId}`)
  closeContextMenu()
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

const getLineDescription = (lineId: string): string => {
  const horizontalLine = props.linesState.horizontal.find(line => line.id === lineId)
  if (horizontalLine) {
    return `Горизонтальная линия (${Math.round(horizontalLine.relativeY * 100)}%)`
  }
  
  const verticalLine = props.linesState.vertical.find(line => line.id === lineId)
  if (verticalLine) {
    return `Вертикальная линия (${Math.round(verticalLine.relativeX * 100)}%)`
  }
  
  return 'Неизвестная линия'
}

// Генерация уникального ID для линий
let lineIdCounter = 0
const generateLineId = (type: 'h' | 'v') => `${type}-${Date.now()}-${++lineIdCounter}`

// Обработка кликов вне меню
const handleDocumentClick = () => {
  if (contextMenu.value.visible) {
    closeContextMenu()
  }
}

onMounted(() => {
  console.log('InteractiveImage mounted')
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
})

</script>

<style scoped>
.interactive-image-container {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  background-color: var(--bg-color-secondary);
}

.image-header {
  text-align: center;
  padding: var(--spacing-sm);
  background-color: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
}

.image-header p {
  margin: 0;
  font-weight: 600;
  color: var(--text-color);
}

.interactive-wrapper {
  position: relative;
  cursor: default;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-color-secondary);
  min-height: 300px;
  padding: var(--spacing-sm);
}

/* НОВОЕ: Контейнер для изображения и линий */
.image-and-lines-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
  max-height: 100%;
}

/* ИСПРАВЛЕНО: Изображение автоматически масштабируется */
.responsive-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

/* ИСПРАВЛЕНО: Overlay для линий, точно повторяет размеры изображения */
.lines-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.line {
  position: absolute;
  background-color: rgba(255, 0, 0, 0.8);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
  z-index: 10;
  transition: background-color 0.2s ease;
  pointer-events: auto;
}

.line:hover {
  background-color: rgba(255, 100, 100, 0.9);
}

.horizontal-line {
  width: 100%;
  height: 2px;
  left: 0;
  cursor: ns-resize;
  transform: translateY(-1px); /* Центрируем линию */
}

.vertical-line {
  width: 2px;
  height: 100%;
  top: 0;
  cursor: ew-resize;
  transform: translateX(-1px); /* Центрируем линию */
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  padding: var(--spacing-xs);
}

.context-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
  background: transparent;
}

.menu-item {
  display: block;
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  border-radius: var(--border-radius-sm);
  margin: 2px 0;
  font-size: var(--font-size-sm);
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background-color: var(--bg-color-secondary);
}

.menu-item.delete:hover {
  background-color: rgba(255, 0, 0, 0.1);
  color: var(--color-error);
}

@media (max-width: 768px) {
  .interactive-wrapper {
    min-height: 200px;
    padding: var(--spacing-xs);
  }
  
  .context-menu {
    min-width: 180px;
  }
  
  .menu-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }
}
</style>