<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import DatasetCard from '@/components/DatasetCard.vue'
import Button from '@/components/Button.vue'
import CreateDatasetModal from '@/components/CreateDatasetModal.vue'
import { datasetsAPI, type Dataset } from '@/api/datasets'

const router = useRouter()

// Состояние компонента
const datasets = ref<Dataset[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showCreateModal = ref(false)

// Загрузка датасетов
const loadDatasets = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await datasetsAPI.getDatasetsList({
      start: 0,
      end: 100,
      sort_field: 'created_at',
      sort_order: 'desc'
    })
    
    datasets.value = response.datasets
  } catch (err) {
    error.value = 'Ошибка при загрузке датасетов'
    console.error('Error loading datasets:', err)
  } finally {
    isLoading.value = false
  }
}

// Создание нового датасета
const handleCreateDataset = async (datasetData: { title: string; description: string }) => {
  try {
    const result = await datasetsAPI.createDataset(datasetData)
    
    if (result.success) {
      showCreateModal.value = false
      await loadDatasets()
    } else {
      error.value = 'Ошибка при создании датасета'
    }
  } catch (err) {
    error.value = 'Ошибка при создании датасета'
    console.error('Error creating dataset:', err)
  }
}

// Удаление датасета
const handleDeleteDataset = async (id: number) => {
  if (!confirm('Вы уверены, что хотите удалить этот датасет? Это действие нельзя отменить.')) {
    return
  }

  try {
    const result = await datasetsAPI.removeDataset(id)
    
    if (result.success) {
      await loadDatasets()
    } else {
      error.value = 'Ошибка при удалении датасета'
    }
  } catch (err) {
    error.value = 'Ошибка при удалении датасета'
    console.error('Error deleting dataset:', err)
  }
}

const handleDatasetClick = (id: string) => {
  router.push(`/dataset/${id}`)
}

const openCreateModal = () => {
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

// Загрузка данных при монтировании компонента
onMounted(() => {
  loadDatasets()
})
</script>

<template>
  <div class="main-layout">
    <Header />
    
    <main class="main-content">
      <div class="container">
        <div class="page-header">
          <h2 class="page-title">Мои датасеты</h2>
          <Button 
            variant="primary" 
            size="medium"
            @click="openCreateModal"
            :disabled="isLoading"
          >
            + Создать датасет
          </Button>
        </div>

        <!-- Сообщение об ошибке -->
        <div v-if="error" class="error-message">
          {{ error }}
          <Button 
            variant="secondary" 
            size="small"
            @click="loadDatasets"
          >
            Попробовать снова
          </Button>
        </div>

        <!-- Индикатор загрузки -->
        <div v-if="isLoading" class="loading">
          Загрузка датасетов...
        </div>

        <!-- Список датасетов -->
        <div v-else-if="datasets.length > 0" class="datasets-grid">
          <DatasetCard
            v-for="dataset in datasets"
            :key="dataset.id"
            :id="dataset.id.toString()"
            :title="dataset.title"
            :description="dataset.description"
            :created-at="new Date(dataset.created_at)"
            :items-count="0"
            @click="handleDatasetClick"
            @delete="handleDeleteDataset"
          />
        </div>

        <!-- Пустое состояние -->
        <div v-else-if="!isLoading" class="empty-state">
          <h3>У вас пока нет датасетов</h3>
          <p>Создайте первый датасет, чтобы начать работу</p>
          <Button 
            variant="primary" 
            size="medium"
            @click="openCreateModal"
          >
            Создать первый датасет
          </Button>
        </div>
      </div>
    </main>

    <!-- Модальное окно создания датасета -->
    <CreateDatasetModal
      :is-visible="showCreateModal"
      @close="closeCreateModal"
      @create="handleCreateDataset"
    />
  </div>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
  background-color: var(--bg-color-secondary);
}

.main-content {
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
}

.datasets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.error-message {
  background-color: var(--error-color);
  color: var(--text-color-button);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-color-secondary);
  font-size: var(--font-size-lg);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
}

.empty-state h3 {
  color: var(--text-color);
  margin-bottom: var(--spacing-sm);
}

.empty-state p {
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-lg);
}
</style>