import { imagesAPI } from './images'
import { manualAnalysisAPI, type ManualLine } from './manual'

// --- Интерфейсы для входящего JSON ---
interface MarkupMetadata {
  luminance: number[][]
  verticalLines: number[]
  horizontalLines: number[]
  selectedCells: Array<{ row: number; col: number; categoryId: string }>
  selectionCategories: Array<{ id: string; name: string; color: string }>
  name: string
}

interface MarkupFile {
  originalImage: string
  blurredImage: string
  metadata: MarkupMetadata
}

export interface ImportResult {
  success: boolean
  filename: string
  message: string
}

type ProgressCallback = (progress: { completed: number; total: number; percent: number }) => void

class MarkupImporter {
  /**
   * Обрабатывает несколько файлов разметки.
   */
  async importFiles(files: FileList, datasetId: number, onProgress?: ProgressCallback): Promise<ImportResult[]> {
    const results: ImportResult[] = []
    const total = files.length
    let completed = 0

    for (const file of Array.from(files)) {
      try {
        const content = await this.readFileAsText(file)
        const result = await this.importMarkup(content, datasetId)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          filename: file.name,
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        })
      }
      completed++
      if (onProgress) {
        onProgress({ completed, total, percent: Math.round((completed / total) * 100) })
      }
    }
    return results
  }

  /**
   * Основная логика импорта одного файла.
   */
  private async importMarkup(jsonContent: string, datasetId: number): Promise<ImportResult> {
    let markupData: MarkupFile
    try {
      markupData = JSON.parse(jsonContent)
    } catch (e) {
      throw new Error('Ошибка парсинга JSON.')
    }

    const { metadata, originalImage, blurredImage } = markupData
    const filename = metadata.name || `imported_${Date.now()}.png`

    // 1. Конвертируем base64 в File
    const imageFile = this.base64ToFile(originalImage, filename)

    // 2. Загружаем изображение в датасет, чтобы получить imageId
    const uploadResponse = await imagesAPI.uploadImage(datasetId, imageFile, filename.replace(/\.[^/.]+$/, ''))
    if (!uploadResponse.success || !uploadResponse.image_id) {
      throw new Error(`Не удалось создать изображение в датасете: ${uploadResponse.message}`)
    }
    const imageId = uploadResponse.image_id

    // 3. Инициализируем состояние в manualAnalysisAPI
    const state = manualAnalysisAPI.getAnalysisState(imageId)
    state.originalImageBase64 = originalImage
    state.blurredImageBase64 = blurredImage
    
    // Получаем и сохраняем размеры изображения
    const dimensions = await this.getImageDimensionsFromBase64(originalImage)
    state.imageDimensions = dimensions

    // Конвертируем пиксельные линии из JSON в относительные и сохраняем в состояние
    const relativeLines = this.convertPixelLinesToRelative(
      metadata.verticalLines,
      metadata.horizontalLines,
      dimensions
    )
    state.currentLines = relativeLines

    // 4. Вызываем calculateMeanLines. Теперь он возьмет линии из состояния.
    await manualAnalysisAPI.calculateMeanLines(imageId)

    // 5. Сохраняем результат категоризации. Этот метод также использует линии из состояния.
    await manualAnalysisAPI.calculateCategorizedMean(
      imageId,
      metadata.selectedCells,
      metadata.selectionCategories
    )

    return {
      success: true,
      filename: filename,
      message: 'Разметка успешно импортирована.',
    }
  }

  // --- Вспомогательные методы ---

  private convertPixelLinesToRelative(
    verticalPixels: number[],
    horizontalPixels: number[],
    dimensions: { width: number; height: number }
  ): { horizontal: ManualLine[]; vertical: ManualLine[] } {
    const vertical = verticalPixels.map((x, index) => ({
      id: `v-imported-${index}`,
      relativeX: x / dimensions.width,
      relativeY: 0
    }))

    const horizontal = horizontalPixels.map((y, index) => ({
      id: `h-imported-${index}`,
      relativeX: 0,
      relativeY: y / dimensions.height
    }))

    return { horizontal, vertical }
  }

  private getImageDimensionsFromBase64(base64Image: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Не удалось загрузить изображение для определения размеров'))
      img.src = base64Image
    })
  }

  private base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',')
    if (arr.length < 2) throw new Error('Неверный формат base64.')
    
    const mimePart = arr[0]
    if (!mimePart) throw new Error('Неверный формат base64: отсутствует MIME-часть.')

    const mimeMatch = mimePart.match(/:(.*?);/)
    if (!mimeMatch) throw new Error('Не удалось определить MIME-тип.')
    
    const mime = mimeMatch[1]
    const b64data = arr[1]
    if (!mime || !b64data) throw new Error('Неверный формат base64.')

    const bstr = atob(b64data)
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }
}

export const markupImporter = new MarkupImporter()