<template>
  <div class="statistics-container">
    <h3>Статистика по категориям</h3>
    <table class="statistics-table">
      <thead>
        <tr>
          <th>Категория</th>
          <th>Цвет</th>
          <th>Кол-во ячеек</th>
          <th>Среднее значение</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="stat in statistics" :key="stat.id">
          <td>{{ stat.name }}</td>
          <td>
            <div 
              class="color-indicator" 
              :style="{ backgroundColor: stat.color }"
            ></div>
          </td>
          <td class="number-cell">{{ stat.count }}</td>
          <td class="number-cell">{{ stat.average.toFixed(3) }}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3"><strong>Общее среднее по всем ячейкам</strong></td>
          <td class="number-cell"><strong>{{ totalAverage.toFixed(3) }}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
interface CategoryStatistic {
  id: string
  name: string
  color: string
  count: number
  average: number
}

interface Props {
  statistics: CategoryStatistic[]
  totalAverage: number
}

defineProps<Props>()
</script>

<style scoped>
.statistics-container {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}

.statistics-container h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-color);
}

.statistics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.statistics-table th, 
.statistics-table td {
  border: 1px solid var(--border-color);
  padding: var(--spacing-sm);
  text-align: left;
}

.statistics-table th {
  background-color: var(--bg-color-secondary);
  font-weight: 600;
}

.number-cell {
  text-align: right;
}

.color-indicator {
  width: 24px;
  height: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
}

.total-row {
  border-top: 2px solid var(--border-color);
}

.total-row td {
  background-color: var(--bg-color-secondary);
}
</style>