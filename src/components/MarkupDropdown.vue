<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/common/Button.vue'

interface Props {
  disabled?: boolean
  selectedImages?: Set<number>
  datasetId?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  manualMarkup: []
}>()

const router = useRouter()
const isOpen = ref(false)

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleManualMarkup = () => {
  emit('manualMarkup')
  closeDropdown()
}

const handleAnalysis = () => {
  if (!props.selectedImages || props.selectedImages.size === 0 || !props.datasetId) {
    alert('Выберите изображения для анализа')
    return
  }
  
  const imageIds = Array.from(props.selectedImages).join(',')
  router.push({
    path: `/analysis/${props.datasetId}`,
    query: { imageIds }
  })
  closeDropdown()
}

// Закрываем dropdown при клике вне его
const handleClickOutside = (event: Event) => {
  if (isOpen.value) {
    const target = event.target as Element
    const dropdown = document.querySelector('.markup-dropdown')
    if (dropdown && !dropdown.contains(target)) {
      closeDropdown()
    }
  }
}

// Добавляем обработчик при монтировании
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="markup-dropdown" :class="{ disabled }">
    <Button
      variant="primary"
      size="medium"
      @click="toggleDropdown"
      :disabled="disabled"
      class="dropdown-trigger"
    >
      🎯 Разметка и анализ
      <span class="dropdown-arrow" :class="{ open: isOpen }">▼</span>
    </Button>
    
    <div v-if="isOpen" class="dropdown-menu">
      <button
        class="dropdown-item"
        @click="handleManualMarkup"
      >
        ✏️ Ручная разметка
      </button>

      <div class="dropdown-divider"></div>
      
      <button 
        class="dropdown-item"
        @click="handleAnalysis"
      >
        📊 Перейти к анализу
      </button>
    </div>
  </div>
</template>

<style scoped>
.markup-dropdown {
  position: relative;
  display: inline-block;
}

.markup-dropdown.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.dropdown-arrow {
  font-size: var(--font-size-xs);
  transition: transform 0.2s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  min-width: 200px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-xs) 0;
  margin-top: var(--spacing-xs);
}

.dropdown-item {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  text-align: left;
  font-size: var(--font-size-sm);
  color: var(--text-color);
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.dropdown-item:hover {
  background-color: var(--bg-color-secondary);
}

.dropdown-item:focus {
  outline: none;
  background-color: var(--primary-color);
  color: white;
}

.dropdown-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: var(--spacing-xs) 0;
}
</style>