<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/common/Button.vue'

interface Props {
  isVisible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  create: [dataset: { title: string; description: string }]
}>()

const title = ref('')
const description = ref('')
const isLoading = ref(false)

const handleSubmit = () => {
  if (title.value.trim()) {
    emit('create', {
      title: title.value.trim(),
      description: description.value.trim()
    })
    resetForm()
  }
}

const handleClose = () => {
  emit('close')
  resetForm()
}

const resetForm = () => {
  title.value = ''
  description.value = ''
  isLoading.value = false
}
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Создать новый датасет</h3>
        <button class="close-button" @click="handleClose">&times;</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-group">
          <label for="title">Название датасета:</label>
          <input 
            id="title"
            v-model="title" 
            type="text" 
            placeholder="Введите название датасета"
            required
            class="form-input"
          >
        </div>
        
        <div class="form-group">
          <label for="description">Описание:</label>
          <textarea 
            id="description"
            v-model="description" 
            placeholder="Введите описание датасета (необязательно)"
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <Button 
            type="button"
            variant="secondary"
            size="medium"
            @click="handleClose"
          >
            Отмена
          </Button>
          
          <Button 
            type="submit" 
            variant="primary"
            size="medium"
            :disabled="!title.trim() || isLoading"
          >
            {{ isLoading ? 'Создание...' : 'Создать' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--bg-color);
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: var(--font-size-lg);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  transition: var(--transition-base);
}

.close-button:hover {
  background-color: var(--bg-color-accent);
  color: var(--text-color);
}

.modal-form {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--text-color);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition: var(--transition-base);
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
}
</style>