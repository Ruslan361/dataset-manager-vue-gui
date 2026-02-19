<template>
  <div class="image-cropper">
    <div class="cropper-header">
      <h4>Обрезка изображения</h4>
    </div>

    <div class="cropper-body" v-if="imageUrl">
      <Cropper
        ref="cropperRef"
        :src="imageUrl"
        :stencil-props="{ aspectRatio: aspectRatio }"
        @change="onChange"
        @ready="onCropperReady" 
        class="cropper"
      />
    </div>

    <div class="no-image" v-else>
      Выберите изображение для обрезки
    </div>

    <div class="cropper-actions">
      <!-- Кнопки остались без изменений -->
      <button @click="reset" :disabled="!props.selectedImageId">Сброс</button>
      <button @click="auto" :disabled="!props.selectedImageId">Авто</button>
      <button @click="localClear">Очистить</button>
      <button @click="apply" :disabled="!lastCanvas || !props.selectedImageId">Применить</button>
      <button @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { imagesAPI } from '@/api/images'
import { cropAPI, type Crop } from '@/api/crop'

interface Props {
  selectedImageId: number | null
  datasetId: number
  aspectRatio?: number // 0 = свободно
}

const props = withDefaults(defineProps<Props>(), {
  aspectRatio: 0
})

const emit = defineEmits<{
  (e: 'apply', dataUrl: string): void
  (e: 'close'): void
}>()

// Используем any, чтобы избежать ошибок TS при вызове методов библиотеки
const cropperRef = ref<any>(null)
const lastCanvas = ref<HTMLCanvasElement | null>(null)
const imageUrl = ref<string>('')

// Храним кроп с сервера, пока картинка не загрузится
const pendingCrop = ref<Crop | null>(null)
const isImageLoaded = ref(false)

// 1. Загрузка URL изображения
const loadImageUrl = async (id: number | null) => {
  imageUrl.value = ''
  isImageLoaded.value = false
  lastCanvas.value = null
  
  if (!id) return

  try {
    try {
      const base64 = await imagesAPI.getImageBase64(id)
      if (base64) {
        imageUrl.value = base64
        return
      }
    } catch (e) { /* ignore */ }

    try {
      const meta = await imagesAPI.getImageById(id)
      if (meta && meta.filename) {
        imageUrl.value = imagesAPI.getImageUrl(meta.dataset_id, meta.filename)
        return
      }
    } catch (e) { /* ignore */ }
    
  } catch (err) {
    console.error('ImageCropper: error loading image', err)
  }
}

// 2. Загрузка координат с сервера
async function loadServerCrop(id: number | null) {
  pendingCrop.value = null
  if (!id) return

  try {
    const serverCrop = await cropAPI.getCrop(id)
    pendingCrop.value = serverCrop
    tryApplyPendingCrop()
  } catch (e) {
    console.warn('loadServerCrop failed or no crop exists:', e)
  }
}

// 3. Событие готовности кропера
const onCropperReady = () => {
  isImageLoaded.value = true
  tryApplyPendingCrop()
}

// 4. Применение отложенного кропа
function tryApplyPendingCrop() {
  if (isImageLoaded.value && pendingCrop.value && cropperRef.value) {
    applyServerCrop(pendingCrop.value)
  }
}

// 5. Установка координат (Set)
function applyServerCrop(c: Crop) {
  if (!cropperRef.value) return

  const width = c.right - c.left
  const height = c.bottom - c.top

  // setCoordinates ожидает { left, top, width, height }
  cropperRef.value.setCoordinates({
    left: c.left,
    top: c.top,
    width: width,
    height: height
  })
}

// Следим за ID изображения
watch(() => props.selectedImageId, async (newId) => {
  await loadImageUrl(newId)
  await loadServerCrop(newId)
}, { immediate: true })

const onChange = ({ canvas }: { canvas: HTMLCanvasElement | null }) => {
  lastCanvas.value = canvas
}

// 6. Получение текущих координат (Get) - ИСПРАВЛЕНО
const getCurrentCrop = (): Crop | null => {
  if (!cropperRef.value) return null
  
  // ВМЕСТО getCoordinates() ИСПОЛЬЗУЕМ getResult()
  const result = cropperRef.value.getResult()
  
  if (!result || !result.coordinates) return null
  
  const { coordinates } = result

  return {
    left: Math.round(coordinates.left),
    top: Math.round(coordinates.top),
    right: Math.round(coordinates.left + coordinates.width),
    bottom: Math.round(coordinates.top + coordinates.height)
  }
}

const apply = async () => {
  if (!lastCanvas.value || !props.selectedImageId) return
  
  const dataUrl = lastCanvas.value.toDataURL('image/png')
  const cropRaw = getCurrentCrop()
  
  if (cropRaw) {
    try {
      await cropAPI.applyCrop(props.selectedImageId, cropRaw)
    } catch (e) {
      console.warn('applyCrop failed:', e)
    }
  }
  emit('apply', dataUrl)
}

const reset = async () => {
  await loadServerCrop(props.selectedImageId)
}

const localClear = () => {
  // ИСПРАВЛЕНО: Вместо null передаем функцию или пустые координаты, 
  // но самый надежный способ сбросить рамку в этой библиотеке - это reset() (центр)
  // или хитрая установка координат за пределы (но это может глючить).
  // Официальный способ "сбросить" - это вернуть рамку к дефолтному состоянию.
  if (cropperRef.value && typeof cropperRef.value.reset === 'function') {
      cropperRef.value.reset()
  }
  lastCanvas.value = null
}

const auto = async () => {
  if (!props.selectedImageId) return
  try {
    const autoCropData = await cropAPI.autoCropImage({ image_id: props.selectedImageId })
    const normalized: Crop = {
      top: Math.round(autoCropData.top),
      bottom: Math.round(autoCropData.bottom),
      left: Math.round(autoCropData.left),
      right: Math.round(autoCropData.right),
    }
    
    // Применяем сразу (картинка уже должна быть загружена, раз мы нажали кнопку)
    applyServerCrop(normalized)
  } catch (e) {
    console.warn('autoCropImage failed:', e)
  }
}
</script>

<style scoped>
/* Ваши стили остались без изменений */
.image-cropper {
  background: #000;
  color: #fff;
  padding: 12px;
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cropper {
  height: 420px;
  width: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.cropper-body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.cropper-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}
.cropper-actions button {
  background: rgba(255,255,255,0.06);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.cropper-actions button:hover:not(:disabled) {
  background: rgba(255,255,255,0.10);
}
.cropper-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.no-image {
  padding: 16px;
  color: rgba(255,255,255,0.6);
  background: transparent;
}
</style>