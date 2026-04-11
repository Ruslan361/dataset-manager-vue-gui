<script lang="ts" setup>
import { useOtherStore } from '@/stores/other'
import { imagesAPI } from '@/api/images'
import Button from '@/components/common/Button.vue'
const otherStore = useOtherStore()
// Метод для принудительной очистки кэша
const clearCache = () => {
  imagesAPI.clearAllCache()
  console.log('Cache cleared')
}

</script>
<template>
  <div class="other-settings">
    <div class="setting-item">
      <label class="setting-label">Режим обратной совместимости</label>
      <input type="checkbox" v-model="otherStore.isBackwardCompatibility" />
    </div>
    <div class="setting-item">
      <label class="setting-label">Количество изображений на странице</label>
      <input type="number" v-model.number="otherStore.imagesInOnePage" min="1" />
    </div>
                <Button 
              variant="secondary"
              size="small"
              @click="clearCache"
              title="Почистить кешу"
            >
            Почистить кешу
                </Button>
  </div>
</template>