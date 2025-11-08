export interface Image {
  id: number
  filename: string
  original_filename: string
  dataset_id: number
}

export interface GetImagesListRequest {
  start: number
  end: number
  sort_field?: 'id' | 'filename' | 'original_filename' | 'dataset_id'
  sort_order?: 'asc' | 'desc'
}

export interface ResponseImagesList {
  images: Image[]
  total: number
  start: number
  end: number
  dataset_id: number
}

export interface ResultResponse {
  success: boolean
  message: string
  image_id?: number // ДОБАВЛЕНО: опциональное поле
}

export interface ImageUploadForm {
  title: string
  dataset_id: number
  description?: string
}

const API_BASE_URL = 'http://localhost:8000/api/v1/IO'

class ImagesAPI {
  private imageCache = new Map<number, string>() // Кэш для base64 строк
  private imageInfoCache = new Map<number, Image>() // Кэш для информации об изображениях

  // Получение информации об изображении по ID
  async getImageById(imageId: number): Promise<Image> {
    // Проверяем кэш
    if (this.imageInfoCache.has(imageId)) {
      return this.imageInfoCache.get(imageId)!
    }

    try {
      const response = await fetch(`${API_BASE_URL}/image/${imageId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const image: Image = await response.json()
      
      // Сохраняем в кэш
      this.imageInfoCache.set(imageId, image)
      
      return image
    } catch (error) {
      console.error(`Error getting image ${imageId}:`, error)
      throw error
    }
  }

  async getImagesList(datasetId: number, params: GetImagesListRequest): Promise<ResponseImagesList> {
    const response = await fetch(`${API_BASE_URL}/dataset/get-images-list/${datasetId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    
    // Сохраняем информацию об изображениях в кэш
    if (result.images) {
      result.images.forEach((image: Image) => {
        this.imageInfoCache.set(image.id, image)
      })
    }

    return result
  }

  async removeImage(imageId: number): Promise<ResultResponse> {
    const response = await fetch(`${API_BASE_URL}/image/remove-image/${imageId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Очищаем кэш для удаленного изображения
    this.imageCache.delete(imageId)
    this.imageInfoCache.delete(imageId)

    return response.json()
  }

  async downloadImage(imageId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/image/download-image/${imageId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.blob()
  }

  // Загрузка одного изображения
  async uploadImage(datasetId: number, file: File, title: string, description?: string): Promise<ResultResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('form_data', JSON.stringify({
      title,
      dataset_id: datasetId,
      description: description || ''
    }))

    const response = await fetch(`${API_BASE_URL}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    // Приводим ответ сервера к интерфейсу ResultResponse
    return {
      success: result.success,
      message: result.message,
      image_id: result.data?.image_id,
    }
  }

  // Загрузка множественных изображений
  async uploadImages(datasetId: number, files: FileList, title: string, description?: string): Promise<ResultResponse[]> {
    const uploadPromises = Array.from(files).map(file => 
      this.uploadImage(datasetId, file, title, description)
    )
    
    return Promise.allSettled(uploadPromises).then(results => 
      results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          return {
            success: false,
            message: result.reason?.message || 'Upload failed'
          } as ResultResponse
        }
      })
    )
  }

  // Загрузка изображений с прогрессом (опционально для будущего использования)
  async uploadImagesWithProgress(
    datasetId: number, 
    files: FileList, 
    title: string, 
    description?: string,
    onProgress?: (progress: { completed: number; total: number; percent: number }) => void
  ): Promise<ResultResponse[]> {
    const results: ResultResponse[] = []
    const total = files.length
    let completed = 0

    for (const file of Array.from(files)) {
      try {
        const result = await this.uploadImage(datasetId, file, title, description)
        results.push(result)
        completed++
        
        if (onProgress) {
          onProgress({
            completed,
            total,
            percent: Math.round((completed / total) * 100)
          })
        }
      } catch (error) {
        results.push({
          success: false,
          message: error instanceof Error ? error.message : 'Upload failed'
        })
        completed++
        
        if (onProgress) {
          onProgress({
            completed,
            total,
            percent: Math.round((completed / total) * 100)
          })
        }
      }
    }

    return results
  }

  // Валидация файлов перед загрузкой
  validateFiles(files: FileList): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    for (const file of Array.from(files)) {
      if (file.size > maxFileSize) {
        errors.push(`Файл "${file.name}" превышает максимальный размер 10MB`)
      }
      
      if (!allowedTypes.includes(file.type)) {
        errors.push(`Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются: JPG, PNG, GIF, WebP`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Метод для получения изображения как base64 строки
  async getImageBase64(imageId: number): Promise<string> {
    // Проверяем кэш
    if (this.imageCache.has(imageId)) {
      return this.imageCache.get(imageId)!
    }

    try {
      const blob = await this.downloadImage(imageId)
      const base64 = await this.blobToBase64(blob)
      
      // Сохраняем в кэш
      this.imageCache.set(imageId, base64)
      
      return base64
    } catch (error) {
      console.error(`Failed to download image ${imageId}:`, error)
      throw error
    }
  }

  // Вспомогательный метод для конвертации Blob в base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result) // Возвращаем полную data URL (data:image/jpeg;base64,...)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Метод для очистки кэша (при необходимости)
  clearImageFromCache(imageId: number) {
    this.imageCache.delete(imageId)
    this.imageInfoCache.delete(imageId)
  }

  // Метод для очистки всего кэша
  clearAllCache() {
    this.imageCache.clear()
    this.imageInfoCache.clear()
  }

  // Метод для получения размера кэша (для отладки)
  getCacheSize(): number {
    return this.imageCache.size
  }

  // Устаревший метод для прямых URL (оставляем для совместимости)
  getImageUrl(datasetId: number, filename: string): string {
    return `${API_BASE_URL}/uploads/images/${datasetId}/${filename}`
  }
}

export const imagesAPI = new ImagesAPI()