<template>
  <div class="importer-container">
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      multiple
      style="display: none"
      @change="handleFileSelect"
    />
    <Button
      variant="secondary"
      size="medium"
      @click="triggerFileInput"
      :disabled="isImporting"
      title="Загрузить файлы разметки в формате JSON"
    >
      <span v-if="isImporting">
        ⏳ Импорт... ({{ progress.percent }}%)
      </span>
      <span v-else>
        📥 Импорт разметки (JSON)
      </span>
    </Button>

    
    <div v-if="importResults.length > 0" class="results-overlay" @click="clearResults">
      <div class="results-modal" @click.stop>
        <h4>Результаты импорта</h4>
        <ul class="results-list">
          <li v-for="(result, index) in importResults" :key="index" :class="{ 'success': result.success, 'error': !result.success }">
            <span class="status-icon">{{ result.success ? '✅' : '❌' }}</span>
            <span class="filename">{{ result.filename }}</span>
            <span class="message">{{ result.message }}</span>
          </li>
        </ul>
        <Button @click="clearResults">Закрыть</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/common/Button.vue'
import { markupImporter, type ImportResult } from '@/api/importer'

const props = defineProps<{
  datasetId: number
}>()

const emit = defineEmits(['import-completed'])

const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const importResults = ref<ImportResult[]>([])
const progress = ref({ percent: 0 })

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  isImporting.value = true
  progress.value = { percent: 0 }

  const results = await markupImporter.importFiles(
    files,
    props.datasetId,
    (p) => {
      progress.value.percent = p.percent
    }
  )

  isImporting.value = false
  importResults.value = results

  if (fileInput.value) {
    fileInput.value.value = ''
  }

  if (results.some(r => r.success)) {
    emit('import-completed')
  }
}

const clearResults = () => {
  importResults.value = []
}
</script>

<style scoped>
.importer-container {
  position: relative;
}
.results-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.results-modal {
  background: var(--bg-color);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}
.results-modal h4 {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
}
.results-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-lg) 0;
}
.results-list li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-xs);
}
.results-list li.success {
  background-color: rgba(74, 222, 128, 0.1);
}
.results-list li.error {
  background-color: rgba(248, 113, 113, 0.1);
}
.filename {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.message {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
}
</style>