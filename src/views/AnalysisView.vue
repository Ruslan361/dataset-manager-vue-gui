<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Button from '@/components/common/Button.vue'
import ImageStrip from '@/components/common/ImageStrip.vue'
import ManualAnalysis from '@/components/manual/ManualAnalysis.vue'
import { imagesAPI, type Image } from '@/api/images'
import { useOtherStore } from '@/stores/other'

const route = useRoute()
const router = useRouter()

const images = ref<Image[]>([])
const selectedImageId = ref<number | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref<'kmeans' | 'manual' | 'crop' | 'combo'>('manual')
const isImagePanelCollapsed = ref(false)
const otherStore = useOtherStore()
const isBackwardCompatibility = computed(() => otherStore.isBackwardCompatibility)

const datasetId = computed(() => parseInt(route.params.datasetId as string))
const imageIds = computed(() => {
  const ids = route.query.imageIds as string
  return ids ? ids.split(',').map(id => parseInt(id)) : []
})

const loadSelectedImages = async () => {
  try {
    isLoading.value = true
    error.value = null

    if (imageIds.value.length === 0) {
      error.value = 'Не выбрано ни одного изображения для анализа'
      return
    }

    const imagePromises = imageIds.value.map(id =>
      imagesAPI.getImageById(id).catch(err => {
        console.error(`Error loading image ${id}:`, err)
        return null
      })
    )

    const loadedImages = await Promise.all(imagePromises)
    images.value = loadedImages.filter(img => img !== null) as Image[]

    if (images.value.length > 0 && images.value[0]) {
      selectedImageId.value = images.value[0].id
    }
  } catch (err) {
    error.value = 'Ошибка при загрузке изображений'
    console.error('Error loading selected images:', err)
  } finally {
    isLoading.value = false
  }
}

const handleImageSelect = (imageId: number) => {
  selectedImageId.value = imageId
}

const handleImageDeleted = (imageId: number) => {
  images.value = images.value.filter(img => img.id !== imageId)

  if (selectedImageId.value === imageId) {
    selectedImageId.value = images.value.length > 0 && images.value[0] ? images.value[0].id : null
  }
}

const goBack = () => {
  router.push(`/dataset/${datasetId.value}`)
}

const setActiveTab = (tab: 'kmeans' | 'manual' | 'crop' | 'combo') => {
  activeTab.value = tab
}

const toggleImagePanel = () => {
  isImagePanelCollapsed.value = !isImagePanelCollapsed.value
}

onMounted(() => {
  loadSelectedImages()
})
</script>

<template>
  <div class="main-layout">
    <Header />
    
    <main class="main-content">
      <div class="container">
        
        <div class="analysis-header">
          <Button 
            variant="secondary"
            size="medium"
            @click="goBack"
          >
            ← Назад к изображениям
          </Button>
          <div class="title-section">
            <h2 class="page-title">Анализ изображений</h2>
            <div class="header-info">
              Документ #{{ datasetId }} • {{ images.length }} изображений
            </div>
          </div>
        </div>

        
        <div v-if="error" class="error-message">
          {{ error }}
          <Button 
            variant="secondary" 
            size="small"
            @click="() => { error = null; loadSelectedImages(); }"
          >
            Повторить
          </Button>
        </div>

        
        <div v-if="isLoading" class="loading">
          <div class="loading-spinner"></div>
          <span>Загрузка изображений...</span>
        </div>

        
        <div v-else-if="images.length > 0" class="analysis-layout" :class="{ 'panel-collapsed': isImagePanelCollapsed }">
          
          <div class="left-panel" :class="{ collapsed: isImagePanelCollapsed }">
            <div class="panel-header" @click="toggleImagePanel">
              <h3 class="panel-title">
                <span v-if="!isImagePanelCollapsed">Изображения для анализа</span>
                <span v-else class="collapsed-title">📷</span>
              </h3>
              <button class="collapse-button" :class="{ rotated: isImagePanelCollapsed }">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
            
            <div class="panel-content" :class="{ collapsed: isImagePanelCollapsed }">
              <ImageStrip
                :images="images"
                :selected-image-id="selectedImageId"
                @image-select="handleImageSelect"
                @image-deleted="handleImageDeleted"
              />
            </div>
          </div>

          
          <div class="right-panel">
            
            <div class="tabs">
              
              <button
                class="tab"
                :class="{ active: activeTab === 'manual' }"
                @click="setActiveTab('manual')"
              >
                Ручной анализ
              </button>
              
            </div>
            
            <div class="tab-content">
              

              <ManualAnalysis
                v-if="activeTab === 'manual'"
                :selected-image-id="selectedImageId"
                :dataset-id="datasetId"
              />

              

            </div>
          </div>
        </div>

        
        <div v-else-if="!isLoading" class="empty-state">
          <div class="empty-state__icon">📊</div>
          <h3>Нет изображений для анализа</h3>
          <p>Вернитесь к списку изображений и выберите изображения для анализа</p>
          <Button 
            variant="primary" 
            size="medium"
            @click="goBack"
          >
            Вернуться к изображениям
          </Button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
  background-color: var(--bg-color-secondary);
}

.main-content {
  padding: var(--spacing-md) 0;
}

.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 var(--spacing-xs) 0;
}

.header-info {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  background-color: var(--bg-color);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  display: inline-block;
}

.analysis-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--spacing-md);
  height: calc(100vh - 160px);
  transition: grid-template-columns 0.3s ease;
}

.analysis-layout.panel-collapsed {
  grid-template-columns: 50px 1fr;
}

.left-panel, .right-panel {
  background-color: var(--bg-color);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.left-panel {
  transition: all 0.3s ease;
}

.left-panel.collapsed {
  min-width: 50px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-color-secondary);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  min-height: 48px;
}

.panel-header:hover {
  background-color: var(--bg-color-hover);
}

.panel-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  transition: all 0.3s ease;
}

.collapsed-title {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  font-size: 18px;
}

.collapse-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-color-secondary);
  transition: all 0.2s ease;
  border-radius: var(--border-radius-sm);
  flex-shrink: 0;
}

.collapse-button:hover {
  background: var(--bg-color-hover);
  color: var(--text-color);
}

.collapse-button.rotated {
  transform: rotate(180deg);
}

.panel-content {
  height: calc(100% - 48px);
  overflow: hidden;
  transition: all 0.3s ease;
}

.panel-content.collapsed {
  width: 0;
  opacity: 0;
}

.tabs {
  display: flex;
  background-color: var(--bg-color-secondary);
  border-bottom: 1px solid var(--border-color);
}

.tab {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  background-color: var(--bg-color);
  color: var(--text-color);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background-color: var(--bg-color);
}

.tab-content {
  padding: var(--spacing-md);
  height: calc(100% - 44px);
  overflow-y: auto;
}

.error-message {
  background-color: var(--error-color);
  color: white;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-sm);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--text-color-secondary);
  font-size: var(--font-size-base);
  gap: var(--spacing-sm);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: var(--spacing-lg);
  background-color: var(--bg-color);
  border-radius: var(--border-radius);
  border: 2px dashed var(--border-color);
  margin: var(--spacing-lg) 0;
}

.empty-state__icon {
  font-size: 48px;
  margin-bottom: var(--spacing-sm);
  opacity: 0.5;
}

.empty-state h3 {
  color: var(--text-color);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.empty-state p {
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-sm);
}

@media (max-width: 1024px) {
  .analysis-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .analysis-layout.panel-collapsed {
    grid-template-columns: 1fr;
  }
  
  .left-panel {
    height: auto;
  }
}

@media (max-width: 768px) {
  .analysis-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .container {
    padding: 0 var(--spacing-sm);
  }
  
  .main-content {
    padding: var(--spacing-sm) 0;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .analysis-layout {
    transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .analysis-layout,
  .left-panel,
  .panel-content,
  .collapse-button {
    transition: none;
  }
}
</style>