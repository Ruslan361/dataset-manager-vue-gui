<template>
  <div class="table-container">
    <div class="table-header">
      <h3>Таблица светимости</h3>
      <div class="table-info">
        <span>Размер: {{ tableState.rows }} × {{ tableState.cols }}</span>
      </div>
    </div>
    
    <div class="table-scroll-wrapper">
      <table class="brightness-table">
        <thead>
          <tr>
            <th class="sticky-column sticky-header">Y\X</th>
            <th 
              v-for="(_, colIndex) in tableState.cols" 
              :key="`header-col-${colIndex}`"
              class="sticky-header"
            >
              {{ columnIntervals[colIndex] || `Кол. ${colIndex + 1}` }}
            </th>
            <th 
              v-for="category in categories" 
              :key="`header-avg-${category.id}`"
              class="sticky-header average-header"
              :style="{ backgroundColor: lightenColor(category.color, 0.3) }"
            >
              Сред. {{ category.name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(_, rowIndex) in tableState.rows" :key="`row-${rowIndex}`">
            <td class="sticky-column row-header">
              {{ rowIntervals[rowIndex] || `Стр. ${rowIndex + 1}` }}
            </td>
            <td
              v-for="(__, colIndex) in tableState.cols"
              :key="`cell-${rowIndex}-${colIndex}`"
              class="data-cell"
              :style="{ backgroundColor: getCellColor(rowIndex, colIndex) }"
              @click="handleCellClick(rowIndex, colIndex)"
              @contextmenu.prevent="showCellMenu($event, rowIndex, colIndex)"
            >
              {{ getCellValue(rowIndex, colIndex) }}
            </td>
            <td 
              v-for="category in categories" 
              :key="`row-avg-${rowIndex}-${category.id}`"
              class="average-cell"
              :style="{ backgroundColor: lightenColor(category.color, 0.5) }"
            >
              {{ getRowAverageByCategory(rowIndex, category.id) }}
            </td>
          </tr>
          
          <tr class="overall-average-row">
            <td class="sticky-column overall-header">Общее среднее</td>
            <td 
              v-for="(_, colIndex) in tableState.cols"
              :key="`col-avg-${colIndex}`"
              class="overall-average-cell"
            >
              
            </td>
            <td 
              v-for="category in categories" 
              :key="`overall-cat-placeholder-${category.id}`"
              class="overall-category-cell"
            >
                {{ getAverageOfRowAveragesByCategory(category.id) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div 
      v-if="cellMenu.visible"
      class="cell-menu"
      :style="{ left: cellMenu.x + 'px', top: cellMenu.y + 'px' }"
      @click.stop
    >
      <div class="menu-header">Выберите класс:</div>
      <button 
        v-for="category in categories"
        :key="category.id"
        class="menu-item"
        @click="selectCellCategory(category.id)"
      >
        <span class="category-color" :style="{ backgroundColor: category.color }"></span>
        {{ category.name }}
      </button>
      <button class="menu-item clear" @click="clearCellSelection">
        🗑️ Очистить
      </button>
    </div>
    <div v-if="cellMenu.visible" class="menu-overlay" @click="closeCellMenu"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'

interface TableState {
  data: number[][];
  rows: number;
  cols: number;
}
interface TableCategory {
  id: string;
  name: string;
  color: string;
}

const props = defineProps({
  tableState: { type: Object as PropType<TableState>, required: true },
  categories: { type: Array as PropType<TableCategory[]>, required: true },
  columnIntervals: { type: Array as PropType<string[]>, default: () => [] },
  rowIntervals: { type: Array as PropType<string[]>, default: () => [] },
  selections: { type: Object as PropType<Record<string, string>>, required: true }
})

const emit = defineEmits<{
  (e: 'update:selections', value: Record<string, string>): void
}>()

const cellMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  selectedRow: -1,
  selectedCol: -1
})

const getCellValue = (row: number, col: number): string => {
  const value = props.tableState.data[row]?.[col];
  return value?.toFixed(3) || '---';
}

const getCellColor = (row: number, col: number): string => {
  const categoryId = props.selections[`${row}-${col}`];
  if (!categoryId) return 'transparent';
  const category = props.categories.find(cat => cat.id === categoryId);
  return category ? lightenColor(category.color, 0.7) : 'transparent';
}

const getRowAverageByCategory = (rowIndex: number, categoryId: string): string => {
  let sum = 0;
  let count = 0;
  for (let colIndex = 0; colIndex < props.tableState.cols; colIndex++) {
    if (props.selections[`${rowIndex}-${colIndex}`] === categoryId) {
      const value = props.tableState.data[rowIndex]?.[colIndex];
      if (typeof value === 'number') {
        sum += value;
        count++;
      }
    }
  }
  return count > 0 ? (sum / count).toFixed(3) : '---';
}

const getColumnAverage = (colIndex: number): string => {
  let sum = 0;
  let count = 0;
  for (let rowIndex = 0; rowIndex < props.tableState.rows; rowIndex++) {
    const value = props.tableState.data[rowIndex]?.[colIndex];
    if (typeof value === 'number') {
      sum += value;
      count++;
    }
  }
  return count > 0 ? (sum / count).toFixed(3) : '---';
}

const getTotalCategoryAverage = (categoryId: string): string => {
  let sum = 0;
  let count = 0;
  for (const key in props.selections) {
    if (props.selections[key] === categoryId) {
      const parts = key.split('-');
      if (parts.length === 2) {
        const row = Number(parts[0]);
        const col = Number(parts[1]);
        if (!isNaN(row) && !isNaN(col)) {
          const value = props.tableState.data[row]?.[col];
          if (typeof value === 'number') {
            sum += value;
            count++;
          }
        }
      }
    }
  }
  return count > 0 ? (sum / count).toFixed(3) : '---';
}

const handleCellClick = (row: number, col: number) => {
  const key = `${row}-${col}`;
  const newSelections = { ...props.selections };
  const primaryCategory = props.categories[0];

  if (newSelections[key] === primaryCategory?.id) {
    delete newSelections[key];
  } else if (primaryCategory) {
    newSelections[key] = primaryCategory.id;
  }
  emit('update:selections', newSelections);
}

const showCellMenu = (event: MouseEvent, row: number, col: number) => {
  cellMenu.value = { visible: true, x: event.clientX, y: event.clientY, selectedRow: row, selectedCol: col };
}

const getAverageOfRowAveragesByCategory = (categoryId: string): string => {
  const rowAverages: number[] = [];
  for (let rowIndex = 0; rowIndex < props.tableState.rows; rowIndex++) {
    const rowAvgStr = getRowAverageByCategory(rowIndex, categoryId);
    if (rowAvgStr !== '---') {
      rowAverages.push(parseFloat(rowAvgStr));
    }
  }

  if (rowAverages.length === 0) {
    return '---';
  }

  const sumOfAverages = rowAverages.reduce((acc, val) => acc + val, 0);
  return (sumOfAverages / rowAverages.length).toFixed(3);
}

const closeCellMenu = () => {
  cellMenu.value.visible = false;
}

const selectCellCategory = (categoryId: string) => {
  const key = `${cellMenu.value.selectedRow}-${cellMenu.value.selectedCol}`;
  const newSelections = { ...props.selections, [key]: categoryId };
  emit('update:selections', newSelections);
  closeCellMenu();
}

const clearCellSelection = () => {
  const key = `${cellMenu.value.selectedRow}-${cellMenu.value.selectedCol}`;
  const newSelections = { ...props.selections };
  delete newSelections[key];
  emit('update:selections', newSelections);
  closeCellMenu();
}

const lightenColor = (color: string, factor: number): string => {
  if (!color || !color.startsWith('#')) {
    return color;
  }

  let hex = color.replace('#', '');

  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  if (hex.length !== 6) {
    return color;
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return color;
  }

  const newR = Math.round(Math.min(255, r + (255 - r) * factor));
  const newG = Math.round(Math.min(255, g + (255 - g) * factor));
  const newB = Math.round(Math.min(255, b + (255 - b) * factor));

  return `rgb(${newR}, ${newG}, ${newB})`;
}

const categoryStatistics = computed(() => {
    return props.categories.map(category => {
        let sum = 0;
        let count = 0;
        for (const key in props.selections) {
            if (props.selections[key] === category.id) {
                const [row, col] = key.split('-').map(Number);
                if (typeof row === 'number' && typeof col === 'number') {
                    const value = props.tableState.data[row]?.[col];
                    if (typeof value === 'number') {
                        sum += value;
                        count++;
                    }
                }
            }
        }
        return { ...category, count, average: count > 0 ? sum / count : 0 };
    });
});

const totalAverage = computed(() => {
    const allValues = props.tableState.data.flat().filter(v => typeof v === 'number');
    if (allValues.length === 0) return 0;
    const sum = allValues.reduce((acc, val) => acc + val, 0);
    return sum / allValues.length;
});

defineExpose({
  getCategoryStatistics: categoryStatistics,
  totalAverage: totalAverage
});

</script>

<style scoped>
.table-container {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}
.table-header h3 { margin: 0; }
.table-info { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
.table-scroll-wrapper {
  overflow: auto;
  max-height: 600px;
  border: 1px solid var(--border-color);
  position: relative;
}
.brightness-table {
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.brightness-table th, .brightness-table td {
  border: 1px solid var(--border-color);
  padding: var(--spacing-xs);
  text-align: center;
  user-select: none;
  min-width: 90px;
}
.sticky-header {
  position: sticky;
  top: 0;
  background-color: var(--bg-color-secondary);
  z-index: 3;
}
.sticky-column {
  position: sticky;
  left: 0;
  background-color: var(--bg-color-secondary);
  z-index: 2;
}
.sticky-column.sticky-header { z-index: 4; }
.data-cell { cursor: pointer; }
.data-cell:hover { background-color: var(--bg-color-hover) !important; }
.average-header, .average-cell { font-size: var(--font-size-xs); }
.overall-average-row { border-top: 2px solid var(--primary-color); font-weight: bold; }
.cell-menu {
  position: fixed;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  padding: var(--spacing-xs);
}
.menu-header { padding: var(--spacing-sm); font-weight: bold; border-bottom: 1px solid var(--border-color); }
.menu-item { display: flex; align-items: center; width: 100%; padding: var(--spacing-sm); border: none; background: none; text-align: left; cursor: pointer; }
.menu-item:hover { background-color: var(--bg-color-hover); }
.menu-item.clear { color: var(--error-color); border-top: 1px solid var(--border-color); }
.category-color { width: 16px; height: 16px; border-radius: 50%; margin-right: var(--spacing-sm); }
.menu-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; }
</style>