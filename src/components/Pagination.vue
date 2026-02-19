<script setup lang="ts">
import { computed } from 'vue'
import Button from '@/components/common/Button.vue'

interface Props {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  maxVisiblePages?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxVisiblePages: 5
})

const emit = defineEmits<{
  pageChange: [page: number]
}>()

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  const max = props.maxVisiblePages
  
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  const half = Math.floor(max / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + max - 1)
  
  if (end - start + 1 < max) {
    start = Math.max(1, end - max + 1)
  }
  
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const canGoPrevious = computed(() => props.currentPage > 1)
const canGoNext = computed(() => props.currentPage < totalPages.value)

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value && page !== props.currentPage) {
    emit('pageChange', page)
  }
}

const goToPrevious = () => {
  if (canGoPrevious.value) {
    goToPage(props.currentPage - 1)
  }
}

const goToNext = () => {
  if (canGoNext.value) {
    goToPage(props.currentPage + 1)
  }
}

const goToFirst = () => {
  goToPage(1)
}

const goToLast = () => {
  goToPage(totalPages.value)
}
</script>

<template>
  <nav class="pagination" v-if="totalPages > 1">
    <div class="pagination__info">
      Страница {{ currentPage }} из {{ totalPages }} 
      ({{ totalItems }} элементов)
    </div>
    
    <div class="pagination__controls">
      <!-- Первая страница -->
      <Button
        variant="secondary"
        size="small"
        :disabled="currentPage === 1"
        @click="goToFirst"
        title="Первая страница"
      >
        ««
      </Button>
      
      <!-- Предыдущая -->
      <Button
        variant="secondary"
        size="small"
        :disabled="!canGoPrevious"
        @click="goToPrevious"
        title="Предыдущая страница"
      >
        «
      </Button>
      
      <!-- Номера страниц -->
      <Button
        v-for="page in visiblePages"
        :key="page"
        :variant="page === currentPage ? 'primary' : 'secondary'"
        size="small"
        @click="goToPage(page)"
      >
        {{ page }}
      </Button>
      
      <!-- Следующая -->
      <Button
        variant="secondary"
        size="small"
        :disabled="!canGoNext"
        @click="goToNext"
        title="Следующая страница"
      >
        »
      </Button>
      
      <!-- Последняя страница -->
      <Button
        variant="secondary"
        size="small"
        :disabled="currentPage === totalPages"
        @click="goToLast"
        title="Последняя страница"
      >
        »»
      </Button>
    </div>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
}

.pagination__info {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  text-align: center;
}

.pagination__controls {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

@media (max-width: 768px) {
  .pagination__controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .pagination__info {
    font-size: var(--font-size-xs);
  }
}
</style>