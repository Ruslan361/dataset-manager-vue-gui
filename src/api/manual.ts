import { reactive } from 'vue'

export interface Line {
  id: string
  relativeX: number // от 0 до 1
  relativeY: number // от 0 до 1
}

export interface ManualLine {
  id: string
  relativeX: number // от 0 до 1
  relativeY: number // от 0 до 1
}

export interface GaussianBlurParams {
  kernel_size: number
  sigma_x: number
  sigma_y: number
}

// Интерфейсы для работы с сервером (с int значениями)
export interface MeanLinesRequest {
  vertical_lines: number[] // int значения в пикселях
  horizontal_lines: number[] // int значения в пикселях
}

export interface MeanLinesResponse {
  success: boolean
  message: string
  means: number[][]
  image_id: number
  result_id: number
  vertical_lines: number[] // int значения от сервера
  horizontal_lines: number[] // int значения от сервера
}

export interface SelectedCell {
  row: number
  col: number
  categoryId: string
}

export interface SelectionCategory {
  id: string
  name: string
  color: string
}

export interface CategorizedMeanRequest {
  verticalLines: number[] // int значения в пикселях
  horizontalLines: number[] // int значения в пикселях
  selectedCells: SelectedCell[]
  selectionCategories: SelectionCategory[]
  imageID: number
}

export interface CategoryMeanResult {
  categoryId: string
  categoryName: string
  color: string
  meanValue: number
  cellCount: number
  cells: Array<{ row: number; col: number }>
  rowMeans: Array<number | null> // Добавлено: средние по строкам
  rowMeansAverage: number | null // Добавлено: общее среднее по строкам
}

export interface CategorizedMeanResponse {
  success: boolean
  message: string
  imageId: number
  resultId: number
  allCellsMean: number
  categoryResults: CategoryMeanResult[]
  overallMean: number
  verticalLines: number[] // int значения
  horizontalLines: number[] // int значения
  totalCells: number
  selectedCellsCount: number
}

export interface SavedAnalysisResult {
  resultId: number
  imageId: number
  verticalLines: number[] // int значения
  horizontalLines: number[] // int значения
  selectedCells?: SelectedCell[]
  selectionCategories?: SelectionCategory[]
  means: number[][]
  allCellsMean?: number
  overallMean?: number
  categoryResults?: CategoryMeanResult[]
  lastUpdated: string
}

export interface ImageDimensions {
  width: number
  height: number
}

export interface ManualParameters {
  image_id: number
  horizontal_lines: number[] // int координаты Y в пикселях
  vertical_lines: number[] // int координаты X в пикселях
  image_width: number
  image_height: number
}

export interface ManualResult {
  id: number
  image_id: number
  parameters: ManualParameters
  brightness_data: number[][] // данные яркости по ячейкам
  created_at: string
  updated_at: string
}

export interface BlurredImageResponse {
  image_id: number
  blurred_image_base64: string
  width: number
  height: number
}

export interface ManualAnalysisState {
  originalImageBase64: string | null
  blurredImageBase64: string | null
  imageDimensions: { width: number; height: number } | null
  currentLines: { horizontal: ManualLine[]; vertical: ManualLine[] }
  lastServerResult: ManualResult | null
  hasUnsavedChanges: boolean
  isProcessing: boolean
}

const API_BASE_URL = 'http://localhost:8000/api/v1/analysis/manual'

class ManualAnalysisAPI {
  // ИЗМЕНЕНО: Делаем хранилище состояний реактивным
  private analysisStates = reactive(new Map<number, ManualAnalysisState>())

  /**
   * Получение состояния анализа для изображения
   */
  getAnalysisState(imageId: number): ManualAnalysisState {
    if (!this.analysisStates.has(imageId)) {
      this.analysisStates.set(imageId, {
        originalImageBase64: null,
        blurredImageBase64: null,
        imageDimensions: null,
        currentLines: { horizontal: [], vertical: [] },
        lastServerResult: null,
        hasUnsavedChanges: false,
        isProcessing: false
      })
    }
    return this.analysisStates.get(imageId)!
  }

  /**
   * Загрузка оригинального изображения
   */
  async loadOriginalImage(imageId: number): Promise<string> {
    const state = this.getAnalysisState(imageId)
    
    if (state.originalImageBase64) {
      return state.originalImageBase64
    }

    try {
      const { imagesAPI } = await import('./images')
      const base64 = await imagesAPI.getImageBase64(imageId)
      state.originalImageBase64 = base64
      
      // Получаем размеры изображения
      const dimensions = await this.getImageDimensions(base64)
      state.imageDimensions = dimensions
      
      console.log(`Original image loaded for ${imageId}:`, dimensions)
      return base64
    } catch (error) {
      console.error('Error loading original image:', error)
      throw error
    }
  }

  /**
   * Получение размытого изображения
   */
  async getBlurredImage(imageId: number): Promise<string> {
    const state = this.getAnalysisState(imageId)
    
    if (state.blurredImageBase64) {
      return state.blurredImageBase64
    }

    try {
      console.log(`Getting blurred image for ${imageId}`)
      
      const response = await fetch(`${API_BASE_URL}/gaussian-blur/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kernel_size: 3,
          sigma_x: 0,
          sigma_y: 0
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const base64 = await this.blobToBase64(blob)
      state.blurredImageBase64 = base64
      
      console.log(`Blurred image loaded for ${imageId}`)
      return base64
    } catch (error) {
      console.error('Error getting blurred image:', error)
      throw error
    }
  }

  /**
   * Проверка существующего результата
   */
  async checkExistingResult(imageId: number): Promise<ManualResult | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/result/${imageId}`)
      
      if (response.status === 404) {
        return null
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const state = this.getAnalysisState(imageId)
      state.lastServerResult = result
      
      // Восстанавливаем линии из результата
      if (state.imageDimensions) {
        // Фильтруем граничные линии (0 и максимальные значения)
        const filteredVertical = result.parameters.vertical_lines.filter(
          (x: number) => x > 0 && x < state.imageDimensions!.width
        )
        const filteredHorizontal: number[] = result.parameters.horizontal_lines.filter(
          (y: number) => y > 0 && y < state.imageDimensions!.height
        )
        
        state.currentLines = this.convertPixelLinesToRelative(
          filteredVertical,
          filteredHorizontal,
          state.imageDimensions
        )
      }
      
      console.log('Found existing result:', result)
      return result
    } catch (error) {
      console.error('Error checking existing result:', error)
      return null
    }
  }

  /**
   * Инициализация линий по умолчанию (3 вертикальные и горизонтальные)
   */
  initializeDefaultLines(imageId: number): { horizontal: ManualLine[]; vertical: ManualLine[] } {
    const state = this.getAnalysisState(imageId)
    
    if (!state.imageDimensions) {
      throw new Error('Image dimensions not available')
    }

    const horizontal: ManualLine[] = []
    const vertical: ManualLine[] = []

    // 3 горизонтальные линии (на 1/4, 1/2, 3/4)
    for (let i = 1; i <= 3; i++) {
      horizontal.push({
        id: `h-${Date.now()}-${i}`,
        relativeX: 0,
        relativeY: i / 4
      })
    }

    // 3 вертикальные линии (на 1/4, 1/2, 3/4)
    for (let i = 1; i <= 3; i++) {
      vertical.push({
        id: `v-${Date.now()}-${i}`,
        relativeX: i / 4,
        relativeY: 0
      })
    }

    state.currentLines = { horizontal, vertical }
    state.hasUnsavedChanges = true
    
    console.log('Initialized default lines:', state.currentLines)
    return state.currentLines
  }

  /**
   * Обновление линий от InteractiveImage
   */
  updateLines(imageId: number, lines: { horizontal: ManualLine[]; vertical: ManualLine[] }) {
    const state = this.getAnalysisState(imageId)
    state.currentLines = lines
    
    // Проверяем, изменились ли параметры по сравнению с последним результатом сервера
    state.hasUnsavedChanges = this.hasParametersChanged(imageId)
    
    console.log('Lines updated:', lines)
    console.log('Has unsaved changes:', state.hasUnsavedChanges)
  }

  /**
   * Вычисление среднего по линиям
   */
  async calculateMeanLines(imageId: number): Promise<ManualResult> {
    const state = this.getAnalysisState(imageId)
    
    if (!state.imageDimensions) {
      throw new Error('Image dimensions not available')
    }

    if (state.currentLines.horizontal.length === 0 || state.currentLines.vertical.length === 0) {
      throw new Error('Lines not configured')
    }

    try {
      state.isProcessing = true
      
      // Конвертируем относительные координаты в int пиксели
      const { verticalPixels, horizontalPixels } = this.convertRelativeLinesToPixels(
        state.currentLines,
        state.imageDimensions
      )

      console.log('Calculating mean with int lines:', { verticalPixels, horizontalPixels })
      
      // ИСПРАВЛЕНО: Отправляем только внутренние линии как int значения
      const verticalLinesForServer = verticalPixels.filter(x => x > 0 && x < state.imageDimensions!.width)
      const horizontalLinesForServer = horizontalPixels.filter(y => y > 0 && y < state.imageDimensions!.height)
      
      console.log('Int lines for server:', { verticalLinesForServer, horizontalLinesForServer })
      
      const response = await fetch(`${API_BASE_URL}/calculate-mean-lines/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vertical_lines: verticalLinesForServer,
          horizontal_lines: horizontalLinesForServer
        } as MeanLinesRequest)
      })

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorData = await response.json()
          console.error('Server error response:', errorData)
          
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail.map((error: any) => {
                if (typeof error === 'string') return error
                if (error.msg && error.loc) {
                  return `${error.loc.join('.')}: ${error.msg}`
                }
                return JSON.stringify(error)
              }).join('; ')
              errorMessage = `Validation error: ${validationErrors}`
            } else {
              errorMessage = errorData.detail
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        
        throw new Error(errorMessage)
      }

      const result: MeanLinesResponse = await response.json()
      
      console.log('Server response received:', result)
      
      // ИСПРАВЛЕНО: Синхронизируем линии с ответом сервера
      if (result.vertical_lines && result.horizontal_lines) {
        const serverLines = this.convertPixelLinesToRelative(
          result.vertical_lines,
          result.horizontal_lines,
          state.imageDimensions
        )
        
        // Обновляем текущие линии в соответствии с сервером
        state.currentLines = serverLines
        console.log('Updated lines from server:', serverLines)
      }
      
      // Создаем результат с int значениями
      const manualResult: ManualResult = {
        id: result.result_id,
        image_id: result.image_id,
        parameters: {
          image_id: result.image_id,
          horizontal_lines: result.horizontal_lines.map(y => Math.round(y)),
          vertical_lines: result.vertical_lines.map(x => Math.round(x)),
          image_width: state.imageDimensions!.width,
          image_height: state.imageDimensions!.height
        },
        brightness_data: result.means,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Сохраняем результат и обновляем состояние
      state.lastServerResult = manualResult
      state.hasUnsavedChanges = false
      
      // ДОБАВЛЕНО: Автоматический пересчет всех средних после сохранения
      await this.recalculateAllMeans(imageId)
      
      console.log('Mean calculation completed with int values:', manualResult)
      return manualResult
      
    } catch (error) {
      console.error('Error calculating mean lines:', error)
      throw error
    } finally {
      state.isProcessing = false
    }
  }

  /**
   * Вычисление категоризованного среднего
   */
  async calculateCategorizedMean(
    imageId: number,
    selectedCells: Array<{ row: number; col: number; categoryId: string }>,
    selectionCategories: Array<{ id: string; name: string; color: string }>
  ): Promise<CategorizedMeanResponse> {
    const state = this.getAnalysisState(imageId)
    
    if (!state.imageDimensions) {
      throw new Error('Image dimensions not available')
    }

    if (state.currentLines.horizontal.length === 0 || state.currentLines.vertical.length === 0) {
      throw new Error('Lines not configured')
    }

    try {
      state.isProcessing = true
      
      // Конвертируем относительные координаты в int пиксели
      const { verticalPixels, horizontalPixels } = this.convertRelativeLinesToPixels(
        state.currentLines,
        state.imageDimensions
      )

      console.log('Calculating categorized mean with int lines:', {
        verticalPixels,
        horizontalPixels,
        selectedCells,
        selectionCategories
      })
      
      // Убеждаемся что все линии - целые числа
      const intVerticalLines = verticalPixels.map(x => Math.round(x))
      const intHorizontalLines = horizontalPixels.map(y => Math.round(y))
      
      console.log('Sending int lines to server:', { intVerticalLines, intHorizontalLines })
      
      const response = await fetch(`${API_BASE_URL}/calculate-categorized-mean/${imageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verticalLines: intVerticalLines,   // int массив
          horizontalLines: intHorizontalLines, // int массив
          selectedCells,
          selectionCategories,
          imageID: imageId
        } as CategorizedMeanRequest)
      })

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const errorData = await response.json()
          console.error('Server error response:', errorData)
          
          if (errorData.detail) {
            // Если detail - это массив ошибок валидации
            if (Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail.map((error: any) => {
                if (typeof error === 'string') return error
                if (error.msg && error.loc) {
                  return `${error.loc.join('.')}: ${error.msg}`
                }
                return JSON.stringify(error)
              }).join('; ')
              errorMessage = `Validation error: ${validationErrors}`
            } else {
              errorMessage = errorData.detail
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        
        throw new Error(errorMessage)
      }

      const result: CategorizedMeanResponse = await response.json()
      
      // Убеждаемся что результат содержит int значения
      result.verticalLines = result.verticalLines.map(x => Math.round(x))
      result.horizontalLines = result.horizontalLines.map(y => Math.round(y))
      
      console.log('Categorized mean calculation completed with int values:', result)
      return result
      
    } catch (error) {
      console.error('Error calculating categorized mean:', error)
      throw error
    } finally {
      state.isProcessing = false
    }
  }

  /**
   * Получение результата категоризованного анализа
   */
  async getCategorizedMeanResult(imageId: number): Promise<CategorizedMeanResponse | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/categorized-mean/${imageId}/result`)
      
      if (response.status === 404) {
        return null
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Получаем ответ от сервера, который имеет вложенную структуру
      const rawResult = await response.json()
      
      // Проверяем, что ответ имеет ожидаемую структуру
      if (!rawResult || !rawResult.result || !rawResult.success) {
        console.warn('Received unexpected format for categorized result:', rawResult)
        return null
      }

      console.log('Found existing categorized result (raw):', rawResult)

      // Преобразуем вложенный ответ в "плоскую" структуру CategorizedMeanResponse
      const formattedResult: CategorizedMeanResponse = {
        success: rawResult.success,
        message: `Restored result from ${rawResult.created_at}`,
        imageId: rawResult.image_id,
        resultId: rawResult.result_id,
        // Данные из вложенного объекта 'result'
        allCellsMean: rawResult.result.allCellsMean || 0, // allCellsMean может не быть
        categoryResults: rawResult.result.categoryResults || [],
        overallMean: rawResult.result.overallMean || 0,
        verticalLines: rawResult.result.verticalLines || [],
        horizontalLines: rawResult.result.horizontalLines || [],
        totalCells: rawResult.result.totalCells || 0,
        selectedCellsCount: rawResult.result.selectedCellsCount || 0
      }
      
      console.log('Formatted categorized result:', formattedResult)
      return formattedResult

    } catch (error) {
      console.error('Error checking categorized result:', error)
      return null
    }
  }

  /**
   * Получение координат ячеек на основе линий
   */
  getCellCoordinates(imageId: number): Array<Array<{ x: number; y: number; width: number; height: number }>> {
    const state = this.getAnalysisState(imageId)
    
    if (!state.imageDimensions || !state.currentLines) {
      return []
    }

    const { verticalPixels, horizontalPixels } = this.convertRelativeLinesToPixels(
      state.currentLines,
      state.imageDimensions
    )

    const cells: Array<Array<{ x: number; y: number; width: number; height: number }>> = []
    
    // Добавляем границы изображения к линиям
    const allVertical = [0, ...verticalPixels.sort((a, b) => a - b), state.imageDimensions.width]
    const allHorizontal = [0, ...horizontalPixels.sort((a, b) => a - b), state.imageDimensions.height]

    for (let row = 0; row < allHorizontal.length - 1; row++) {
      const cellRow: Array<{ x: number; y: number; width: number; height: number }> = []
      
      for (let col = 0; col < allVertical.length - 1; col++) {
        cellRow.push({
          x: allVertical[col]!,
          y: allHorizontal[row]!,
          width: allVertical[col + 1]! - allVertical[col]!,
          height: allHorizontal[row + 1]! - allHorizontal[row]!
        })
      }
      
      cells.push(cellRow)
    }

    return cells
  }

  /**
   * Получение размеров ячеек для таблицы
   */
  getCellDimensions(imageId: number): { yBlockSize: number; xBlockSize: number } {
    const state = this.getAnalysisState(imageId)
    
    if (!state.imageDimensions || !state.currentLines) {
      return { yBlockSize: 16, xBlockSize: 18 }
    }

    const rows = state.currentLines.horizontal.length + 1
    const cols = state.currentLines.vertical.length + 1
    
    return {
      yBlockSize: Math.round(state.imageDimensions.height / rows),
      xBlockSize: Math.round(state.imageDimensions.width / cols)
    }
  }

  /**
   * Проверка несохраненных изменений
   */
  hasUnsavedChanges(imageId: number): boolean {
    const state = this.getAnalysisState(imageId)
    return state.hasUnsavedChanges
  }

  /**
   * Показать предупреждение о несохраненных изменениях
   */
  showUnsavedChangesWarning(): boolean {
    return confirm(
      'У вас есть несохраненные изменения. Если вы перейдете, все изменения будут потеряны. Продолжить?'
    )
  }

  /**
   * Очистка состояния для изображения
   */
  clearAnalysisState(imageId: number): void {
    this.analysisStates.delete(imageId)
    console.log(`Cleared analysis state for image ${imageId}`)
  }

  // Вспомогательные методы

  private async getImageDimensions(base64Image: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        })
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image for dimension calculation'))
      }
      
      img.src = base64Image
    })
  }

  private convertRelativeLinesToPixels(
    lines: { horizontal: ManualLine[]; vertical: ManualLine[] },
    dimensions: { width: number; height: number }
  ): { verticalPixels: number[]; horizontalPixels: number[] } {
    // ИСПРАВЛЕНО: Сразу конвертируем в int значения
    const verticalPixels = lines.vertical
      .map(line => Math.round(line.relativeX * dimensions.width))
      .sort((a, b) => a - b)

    const horizontalPixels = lines.horizontal
      .map(line => Math.round(line.relativeY * dimensions.height))
      .sort((a, b) => a - b)

    // Добавляем границы изображения как int значения
    const allVertical = [0, ...verticalPixels.filter(x => x > 0 && x < dimensions.width), dimensions.width]
    const allHorizontal = [0, ...horizontalPixels.filter(y => y > 0 && y < dimensions.height), dimensions.height]

    return { 
      verticalPixels: [...new Set(allVertical)].sort((a, b) => a - b),
      horizontalPixels: [...new Set(allHorizontal)].sort((a, b) => a - b)
    }
  }

  private convertPixelLinesToRelative(
    verticalPixels: number[],
    horizontalPixels: number[],
    dimensions: { width: number; height: number }
  ): { horizontal: ManualLine[]; vertical: ManualLine[] } {
    // ИСПРАВЛЕНО: Фильтруем границы при конвертации обратно в относительные координаты
    const filteredVertical = verticalPixels.filter(x => x > 0 && x < dimensions.width)
    const filteredHorizontal = horizontalPixels.filter(y => y > 0 && y < dimensions.height)
    
    const vertical = filteredVertical.map((x, index) => ({
      id: `v-restored-${index}`,
      relativeX: x / dimensions.width,
      relativeY: 0
    }))

    const horizontal = filteredHorizontal.map((y, index) => ({
      id: `h-restored-${index}`,
      relativeX: 0,
      relativeY: y / dimensions.height
    }))

    return { horizontal, vertical }
  }

  private hasParametersChanged(imageId: number): boolean {
    const state = this.getAnalysisState(imageId)
    
    if (!state.lastServerResult || !state.imageDimensions) {
      return true
    }

    const { verticalPixels, horizontalPixels } = this.convertRelativeLinesToPixels(
      state.currentLines,
      state.imageDimensions
    )

    // ИСПРАВЛЕНО: Сравниваем только внутренние линии, так как границы добавляются сервером
    const currentVertical = verticalPixels.filter(x => x > 0 && x < state.imageDimensions!.width).sort((a, b) => a - b)
    const currentHorizontal = horizontalPixels.filter(y => y > 0 && y < state.imageDimensions!.height).sort((a, b) => a - b)

    const serverVertical = state.lastServerResult.parameters.vertical_lines
      .filter(x => x > 0 && x < state.imageDimensions!.width).sort((a, b) => a - b)
    const serverHorizontal = state.lastServerResult.parameters.horizontal_lines
      .filter(y => y > 0 && y < state.imageDimensions!.height).sort((a, b) => a - b)

    return !this.arraysEqual(serverVertical, currentVertical) || 
           !this.arraysEqual(serverHorizontal, currentHorizontal)
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i])
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

  /**
   * Форматирование ошибок
   */
  formatError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return 'Ошибка сети. Проверьте подключение к серверу.'
      }
      if (error.message.includes('404')) {
        return 'Результат не найден.'
      }
      if (error.message.includes('500')) {
        return 'Внутренняя ошибка сервера.'
      }
      return error.message
    }
    
    return 'Произошла неизвестная ошибка'
  }

  /**
   * Пересчет всех средних значений после сохранения
   */
  async recalculateAllMeans(imageId: number): Promise<{
    cellMeans: number[][];
    rowMeans: number[];
    colMeans: number[];
    overallMean: number;
  }> {
    const state = this.getAnalysisState(imageId);
    
    if (!state.lastServerResult?.brightness_data) {
      throw new Error('No brightness data available for recalculation');
    }

    const brightnessData = state.lastServerResult.brightness_data;
    const cellMeans = brightnessData;
    
    // Пересчитываем средние по строкам
    const rowMeans = cellMeans.map(row => {
      const validValues = row.filter(val => val !== null && !isNaN(val));
      return validValues.length > 0 
        ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length 
        : 0;
    });

    // Пересчитываем средние по колонкам
    const colMeans: number[] = [];
    const colCount = cellMeans.length > 0 ? (cellMeans[0]?.length || 0) : 0;
    for (let col = 0; col < colCount; col++) {
      const columnValues = cellMeans
        .map(row => row[col])
        .filter((val): val is number => val !== null && val !== undefined && !isNaN(val));
      colMeans[col] = columnValues.length > 0
        ? columnValues.reduce((sum, val) => sum + val, 0) / columnValues.length
        : 0;
    }

    // Пересчитываем общее среднее как арифметическое всех ячеек
    const allValues = cellMeans.flat().filter(val => val !== null && !isNaN(val));
    const overallMean = allValues.length > 0 
      ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length 
      : 0;

    console.log('Recalculated means:', { rowMeans, colMeans, overallMean });
    
    return {
      cellMeans,
      rowMeans,
      colMeans,
      overallMean
    };
  }

  /**
   * Получение средних по категориям для строки итогов
   */
  getCategoryRowMeans(categoryResults: CategoryMeanResult[]): Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    rowMeansAverage: number;
  }> {
    return categoryResults.map(category => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      color: category.color,
      rowMeansAverage: category.rowMeansAverage || 0
    }));
  }

  /**
   * Обновление таблицы при смене изображения
   */
  async updateTableForNewImage(imageId: number): Promise<{
    dimensions: { rows: number; cols: number };
    cellMeans?: number[][];
    rowMeans?: number[];
    colMeans?: number[];
    overallMean?: number;
  }> {
    const state = this.getAnalysisState(imageId);
    
    if (!state.currentLines.horizontal.length || !state.currentLines.vertical.length) {
      // Инициализируем линии по умолчанию если их нет
      this.initializeDefaultLines(imageId);
    }

    const dimensions = {
      rows: state.currentLines.horizontal.length + 1,
      cols: state.currentLines.vertical.length + 1
    };

    // Если есть сохраненный результат, возвращаем его данные
    if (state.lastServerResult?.brightness_data) {
      const recalculated = await this.recalculateAllMeans(imageId);
      return {
        dimensions,
        ...recalculated
      };
    }

    // Иначе возвращаем только размеры
    return { dimensions };
  }

  /**
   * Исправленный расчет категоризованного среднего с правильными средними по категориям
   */
  async calculateCategorizedMeanFixed(
    imageId: number,
    selectedCells: Array<{ row: number; col: number; categoryId: string }>,
    selectionCategories: Array<{ id: string; name: string; color: string }>
  ): Promise<CategorizedMeanResponse & { 
    categoryRowMeans: Array<{
      categoryId: string;
      categoryName: string; 
      color: string;
      rowMeansAverage: number;
    }>;
    fixedOverallMean: number;
  }> {
    // Сначала получаем стандартный результат
    const result = await this.calculateCategorizedMean(imageId, selectedCells, selectionCategories);
    
    // Пересчитываем общее среднее как арифметическое всех ячеек
    const state = this.getAnalysisState(imageId);
    if (state.lastServerResult?.brightness_data) {
      const allValues = state.lastServerResult.brightness_data.flat().filter(val => val !== null && !isNaN(val));
      const fixedOverallMean = allValues.length > 0 
        ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length 
        : 0;
      
      // Получаем средние по категориям для строки итогов
      const categoryRowMeans = this.getCategoryRowMeans(result.categoryResults);
      
      return {
        ...result,
        categoryRowMeans,
        fixedOverallMean
      };
    }

    return {
      ...result,
      categoryRowMeans: this.getCategoryRowMeans(result.categoryResults),
      fixedOverallMean: result.overallMean
    };
  }

  /**
   * Обновление шапки таблицы при изменении линий
   */
  updateTableHeaders(imageId: number): { 
    rowHeaders: string[]; 
    colHeaders: string[] 
  } {
    const state = this.getAnalysisState(imageId);
    
    const rows = state.currentLines.horizontal.length + 1;
    const cols = state.currentLines.vertical.length + 1;

    const rowHeaders = Array.from({ length: rows }, (_, i) => `Строка ${i + 1}`);
    const colHeaders = Array.from({ length: cols }, (_, i) => `Колонка ${i + 1}`);

    return { rowHeaders, colHeaders };
  }

  /**
   * Сброс состояния таблицы при смене изображения
   */
  resetTableState(imageId: number): void {
    const state = this.getAnalysisState(imageId);
    
    // Сбрасываем выделенные ячейки и категории
    // Эти данные должны храниться отдельно в компоненте таблицы
    console.log(`Reset table state for image ${imageId}`);
  }

  /**
   * НОВЫЙ: Безопасное обновление таблицы при смене изображения
   */
  async safeUpdateTableForNewImage(imageId: number): Promise<{
    dimensions: { rows: number; cols: number };
    cellMeans?: number[][];
    rowMeans?: number[];
    colMeans?: number[];
    overallMean?: number;
    cellSelections?: Record<string, string>;
    success: boolean;
  }> {
    try {
      const state = this.getAnalysisState(imageId);
      
      if (!state.currentLines.horizontal.length || !state.currentLines.vertical.length) {
        console.log('No lines found, initializing defaults for image', imageId)
        this.initializeDefaultLines(imageId);
      }

      const dimensions = {
        rows: state.currentLines.horizontal.length + 1,
        cols: state.currentLines.vertical.length + 1
      };

      console.log('Calculated dimensions for image', imageId, ':', dimensions)

      // Если есть сохраненный результат, возвращаем его данные
      if (state.lastServerResult?.brightness_data) {
        console.log('Found saved result, recalculating means...')
        
        const recalculated = await this.recalculateAllMeans(imageId);
        
        // Безопасно пытаемся восстановить выделения ячеек
        const cellSelections = await this.safeRestoreCellSelections(imageId);
        
        return {
          dimensions,
          ...recalculated,
          cellSelections,
          success: true
        };
      }

      // Иначе возвращаем только размеры
      console.log('No saved result found, returning dimensions only')
      return { 
        dimensions, 
        cellSelections: {},
        success: true 
      };
      
    } catch (error) {
      console.error('Error in safeUpdateTableForNewImage:', error)
      return {
        dimensions: { rows: 4, cols: 4 },
        cellSelections: {},
        success: false
      }
    }
  }

  /**
   * НОВЫЙ: Безопасное восстановление выделений ячеек
   */
  async safeRestoreCellSelections(imageId: number): Promise<Record<string, string>> {
    try {
      const categorizedResult = await this.getCategorizedMeanResult(imageId)
      
      if (!categorizedResult?.categoryResults) {
        console.log('No categorized results found for image', imageId)
        return {}
      }
      
      const restoredSelections: Record<string, string> = {}
      let cellCount = 0
      
      categorizedResult.categoryResults.forEach(categoryResult => {
        if (categoryResult.cells && Array.isArray(categoryResult.cells)) {
          categoryResult.cells.forEach(cell => {
            if (cell && typeof cell.row === 'number' && typeof cell.col === 'number') {
              const cellKey = `${cell.row}-${cell.col}`
              restoredSelections[cellKey] = categoryResult.categoryId
              cellCount++
            }
          })
        }
      })
      
      console.log(`Safely restored ${cellCount} cell selections for image ${imageId}:`, restoredSelections)
      return restoredSelections
      
    } catch (error) {
      console.error('Error safely restoring cell selections:', error)
      return {}
    }
  }
}

// Экспортируем singleton instance
export const manualAnalysisAPI = new ManualAnalysisAPI()