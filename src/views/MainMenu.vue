<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import DatasetCard from '@/components/common/DatasetCard.vue'
import Button from '@/components/common/Button.vue'
import CreateDatasetModal from '@/components/CreateDatasetModal.vue'
import EditDatasetModal from '@/components/EditDatasetModal.vue'
import { datasetsAPI, type Dataset } from '@/api/datasets'
import { imagesAPI } from '@/api/images'

const router = useRouter()

// Состояние компонента
const datasets = ref<Dataset[]>([])
const datasetPreviews = ref<Record<number, { images: string[]; total: number }>>({})
const isLoading = ref(false)
const error = ref<string | null>(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingDataset = ref<Dataset | null>(null)
const importLoading = ref(false)
// ID датасета, который сейчас экспортируется (для индикации загрузки)
const exportingId = ref<number | null>(null)

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
    await loadDatasetPreviews(response.datasets)
  } catch (err) {
    error.value = 'Ошибка при загрузке датасетов'
    console.error('Error loading datasets:', err)
  } finally {
    isLoading.value = false
  }
}

const loadDatasetPreviews = async (datasetsList: Dataset[]) => {
  const previewEntries = await Promise.allSettled(
    datasetsList.map(async (dataset) => {
      const imagesResponse = await imagesAPI.getImagesList(dataset.id, {
        start: 0,
        end: 4,
        sort_field: 'id',
        sort_order: 'asc'
      })

      return [
        dataset.id,
        {
          images: await Promise.all(
            imagesResponse.images
              .slice(0, 4)
              .map((image) => imagesAPI.getImageBase64(image.id))
          ),
          total: imagesResponse.total
        }
      ] as const
    })
  )

  const nextPreviews: Record<number, { images: string[]; total: number }> = {}

  for (const entry of previewEntries) {
    if (entry.status === 'fulfilled') {
      const [datasetId, previewData] = entry.value
      nextPreviews[datasetId] = previewData
    }
  }

  datasetPreviews.value = nextPreviews
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

const openEditModal = (datasetId: string) => {
  const dataset = datasets.value.find((item) => item.id.toString() === datasetId)
  if (!dataset) return

  editingDataset.value = dataset
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingDataset.value = null
}

const handleEditDataset = async (datasetData: { title: string; description: string }) => {
  if (!editingDataset.value) return

  try {
    const result = await datasetsAPI.updateDataset(editingDataset.value.id, datasetData)

    if (result.success) {
      closeEditModal()
      await loadDatasets()
    } else {
      error.value = 'Ошибка при обновлении датасета'
    }
  } catch (err) {
    error.value = 'Ошибка при обновлении датасета'
    console.error('Error updating dataset:', err)
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

// Экспорт датасета
const handleExportDataset = async (id: number) => {
  if (exportingId.value) return // Блокируем повторный клик
  
  try {
    exportingId.value = id
    // Получаем готовую ссылку для скачивания от бэкенда
    const downloadUrl = await datasetsAPI.exportDataset(id)
    
    // Проверяем, запущено ли приложение внутри Tauri
    const isTauri = true
    
    if (isTauri) {
      // ==========================================
      // ЛОГИКА ДЛЯ ДЕСКТОПА (TAURI)
      // ==========================================
      try {
        // Динамически импортируем плагины (чтобы не ломать сборку для обычного Web)
        // Внимание: ниже импорты для Tauri v2. 
        // Если у вас Tauri v1, используйте '@tauri-apps/api/dialog' и '@tauri-apps/api/fs'
        const { save } = await import('@tauri-apps/plugin-dialog')
        const { writeFile } = await import('@tauri-apps/plugin-fs')
        
        // 1. Открываем системное диалоговое окно сохранения
        const filePath = await save({
          defaultPath: `dataset_${id}.zip`,
          filters:[{ name: 'Архив датасета', extensions: ['zip'] }]
        })
        
        if (filePath) {
          // 2. Скачиваем файл (данные) через fetch 
          const response = await fetch(downloadUrl)
          if (!response.ok) throw new Error('Ошибка при скачивании файла')
          
          const arrayBuffer = await response.arrayBuffer()
          
          // 3. Сохраняем файл на диск 
          // (Для Tauri v1 метод называется writeBinaryFile)
          await writeFile(filePath, new Uint8Array(arrayBuffer))
        }
      } catch (tauriErr) {
        console.warn('Tauri FS API error, фолбэк на системный браузер:', tauriErr)
        
        // Фолбэк на случай огромных файлов (>2GB) или ошибок прав:
        // Откроет ссылку в браузере по умолчанию (Chrome/Edge/Safari), который сам скачает файл
        const { open } = await import('@tauri-apps/plugin-shell')
        await open(downloadUrl)
      }
    } else {
      // ==========================================
      // ЛОГИКА ДЛЯ ОБЫЧНОГО ВЕБ-БРАУЗЕРА
      // ==========================================
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `dataset_${id}.zip` // Подсказка браузеру, что файл нужно скачать
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    
  } catch (err: any) {
    error.value = err.message || 'Ошибка при экспорте датасета'
    console.error('Error exporting dataset:', err)
  } finally {
    exportingId.value = null
  }
}

// Обработчик выбора файла для импорта
const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) {
    return
  }
  const file = input.files[0]
  if (!file) {
    return
  }
  
  importLoading.value = true
  error.value = null

  try {
    const result = await datasetsAPI.importDataset(file)
    if (result.success) {
      await loadDatasets()
    } else {
      error.value = result.message || 'Ошибка при импорте датасета'
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка при импорте датасета'
    console.error('Error importing dataset:', err)
  } finally {
    importLoading.value = false
    // Reset file input
    input.value = ''
  }
}

// Триггер для инпута файла
const triggerFileInput = () => {
  const fileInput = document.getElementById('import-dataset-input')
  fileInput?.click()
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
          <h2 class="page-title">Мои документы</h2>
          <div class="header-actions">
            <input type="file" id="import-dataset-input" @change="onFileSelected" accept=".zip" hidden>
            <Button
              variant="secondary"
              size="medium"
              @click="triggerFileInput"
              :disabled="isLoading || importLoading"
            >
              {{ importLoading ? 'Импорт...' : 'Импортировать датасет' }}
            </Button>
            <Button 
              variant="primary" 
              size="medium"
              @click="openCreateModal"
              :disabled="isLoading || importLoading"
            >
              + Создать документ
            </Button>
          </div>
        </div>

        <!-- Сообщение об ошибке -->
        <div v-if="error" class="error-message">
          {{ error }}
          <Button 
            variant="secondary" 
            size="small"
            @click="() => { error = null; loadDatasets(); }"
          >
            Закрыть
          </Button>
        </div>

        <!-- Индикатор загрузки -->
        <div v-if="isLoading" class="loading">
          Загрузка документов...
        </div>

        <!-- Список документов -->
        <div v-else-if="datasets.length > 0" class="datasets-grid">
          <DatasetCard
            v-for="dataset in datasets"
            :key="dataset.id"
            :id="dataset.id.toString()"
            :title="dataset.title"
            :description="dataset.description"
            :created-at="new Date(dataset.created_at)"
            :preview-images="datasetPreviews[dataset.id]?.images || []"
            :items-count="datasetPreviews[dataset.id]?.total || 0"
            :is-exporting="exportingId === dataset.id"
            @click="handleDatasetClick"
            @edit="openEditModal"
            @delete="handleDeleteDataset"
            @export="handleExportDataset"
          />
        </div>

        <!-- Пустое состояние -->
        <div v-else-if="!isLoading" class="empty-state">
          <h3>У вас пока нет документов</h3>
          <p>Создайте первый документ, чтобы начать работу</p>
          <Button 
            variant="primary" 
            size="medium"
            @click="openCreateModal"
          >
            Создать первый документ
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

    <EditDatasetModal
      :is-visible="showEditModal"
      :title="editingDataset?.title || ''"
      :description="editingDataset?.description || ''"
      @close="closeEditModal"
      @save="handleEditDataset"
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

.header-actions {
  display: flex;
  gap: var(--spacing-md);
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