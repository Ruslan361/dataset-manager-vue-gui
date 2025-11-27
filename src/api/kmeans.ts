export type KMeansStatus = 'processing' | 'completed' | 'failed'

export interface KMeansParameters {
  nclusters: number
  criteria: string
  max_iterations: number
  attempts: number
  epsilon: number
  flags: string
  colors: Array<[number, number, number]>
}

export interface KMeansResult {
  result_id: number
  image_id: number
  method: string
  created_at: string
  status: KMeansStatus
  error?: string
  result: {
    nclusters?: number
    criteria?: string
    max_iterations?: number
    attempts?: number
    epsilon?: number
    flags?: string
    
    // Исправление здесь: добавляем оба варианта
    colors?: Array<[number, number, number]>      // Новое поле (приходит из params)
    colors_rgb?: Array<[number, number, number]>  // Старое поле (для совместимости)
    
    centers_sorted?: number[]
    compactness?: number
    original_shape?: number[]
    processed_pixels?: number
    
    // Для ресурсов
    resources?: Array<{
      type: string
      key: string
      path: string
    }>
  }
  has_result_image: boolean
  result_image_path: string | null
}

export interface KMeansStartResponse {
  success: boolean
  message: string
  image_id: number
  result_id: number
  status: KMeansStatus
  parameters?: {
    nclusters: number
    criteria: string
    max_iterations: number
    attempts: number
    epsilon: number
    flags: string
    colors: Array<[number, number, number]>
  }
}

const API_BASE_URL = 'http://localhost:8000/api/v1/analysis/kmeans'

class KMeansAPI {
  /**
   * Запуск K-Means анализа изображения
   */
  async runAnalysis(imageId: number, parameters: KMeansParameters): Promise<KMeansStartResponse> {
    try {
      console.log(`Starting K-Means analysis for image ${imageId}`, parameters)
      
      const response = await fetch(`${API_BASE_URL}/kmeans/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || 
          `HTTP error! status: ${response.status}`
        )
      }

      const data = await response.json()
      console.log('K-Means analysis started successfully:', data)
      
      return data
    } catch (error) {
      console.error('Error starting K-Means analysis:', error)
      throw error
    }
  }

  /**
   * Получение результата K-Means анализа
   */
  async getResult(imageId: number): Promise<KMeansResult | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/kmeans/${imageId}/result`)
      
      if (response.status === 404) {
        return null
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || 
          `HTTP error! status: ${response.status}`
        )
      }

      const data = await response.json()
      
      // Логируем только если статус изменился или завершен
      if (data.status !== 'processing') {
         console.log('K-Means result retrieved:', data)
      }
      
      return data
    } catch (error) {
      console.error('Error getting K-Means result:', error)
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Получение результирующего изображения в формате base64
   */
  async getResultImageBase64(imageId: number): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/kmeans/${imageId}/result/image`)
      
      if (response.status === 404 || response.status === 400) {
        console.log(`Result image not available for image ${imageId} (status: ${response.status})`)
        return null
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const base64 = await this.blobToBase64(blob)
      
      console.log(`K-Means result image loaded for image ${imageId}`)
      return base64
      
    } catch (error) {
      console.error('Error getting K-Means result image:', error)
      return null
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert blob to base64'))
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  getBase64ImageUrl(base64: string): string {
    if (base64.startsWith('data:')) {
      return base64
    }
    return `data:image/jpeg;base64,${base64}`
  }

  validateParameters(params: KMeansParameters): string[] {
    const errors: string[] = []
    if (params.nclusters < 2 || params.nclusters > 10) errors.push('Количество кластеров должно быть от 2 до 10')
    if (params.max_iterations < 10 || params.max_iterations > 500) errors.push('Максимальное количество итераций должно быть от 10 до 500')
    if (params.attempts < 1 || params.attempts > 10) errors.push('Количество попыток должно быть от 1 до 10')
    if (params.epsilon <= 0 || params.epsilon > 10) errors.push('Epsilon должно быть больше 0 и не больше 10')
    if (params.colors.length !== params.nclusters) errors.push('Количество цветов должно соответствовать количеству кластеров')
    return errors
  }

  getDefaultParameters(nclusters: number = 3): KMeansParameters {
    const colors: Array<[number, number, number]> = []
    for (let i = 0; i < nclusters; i++) {
      const hue = (i * 360) / nclusters
      const rgb = this.hslToRgb(hue, 70, 50)
      colors.push([rgb.r, rgb.g, rgb.b])
    }
    return {
      nclusters,
      criteria: 'all',
      max_iterations: 100,
      attempts: 5,
      epsilon: 0.5,
      flags: 'pp',
      colors
    }
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    s /= 100; l /= 100
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = l - c / 2
    let r = 0, g = 0, b = 0
    if (0 <= h && h < 60) { r = c; g = x; b = 0 }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0 }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    }
  }

  formatError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) return 'Ошибка сети. Проверьте подключение к серверу.'
      if (error.message.includes('404')) return 'Результат анализа не найден.'
      if (error.message.includes('500')) return 'Внутренняя ошибка сервера.'
      return error.message
    }
    return 'Произошла неизвестная ошибка'
  }
}

export const kmeansAPI = new KMeansAPI()