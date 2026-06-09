export interface TableData {
  rows: number
  cols: number
  data: number[][]
  rowHeaders: string[]
  colHeaders: string[]
  cellSelections: Record<string, string>
  yBlockSize: number
  xBlockSize: number
}

export interface TableCategory {
  id: string
  name: string
  color: string
}

export class TableController {
  private tableElement: HTMLTableElement | null = null
  private data: TableData = {
    rows: 0,
    cols: 0,
    data: [],
    rowHeaders: [],
    colHeaders: [],
    cellSelections: {},
    yBlockSize: 16,
    xBlockSize: 18
  }
  
  private categories: TableCategory[] = [
    { id: 'epidermis', name: 'Эпидермис', color: '#90EE90' },
    { id: 'dermis', name: 'Дерма', color: '#FFFFE0' }
  ]

  private onSelectionChange: ((selections: Record<string, string>) => void) | null = null

  constructor(tableElement: HTMLTableElement) {
    this.tableElement = tableElement
  }

  // ОСНОВНЫЕ МЕТОДЫ УПРАВЛЕНИЯ
  
  /**
   * Полная перестройка таблицы с новыми данными
   */
  rebuildTable(newData: Partial<TableData>): void {
    console.log('Rebuilding table with new data:', newData)
    
    // Обновляем данные
    this.data = { ...this.data, ...newData }
    
    // Полностью перестраиваем DOM таблицы
    this.buildTableStructure()
    this.populateTableData()
    this.updateHeaders()
    this.applyCellSelections()
    this.bindEvents()
    
    console.log('Table rebuilt successfully')
  }

  /**
   * Обновление размеров таблицы без изменения данных
   */
  updateDimensions(rows: number, cols: number): void {
    if (this.data.rows === rows && this.data.cols === cols) {
      console.log('Dimensions unchanged, skipping update')
      return
    }
    
    console.log(`Updating table dimensions: ${rows}x${cols}`)
    
    this.data.rows = rows
    this.data.cols = cols
    
    // Перестраиваем структуру
    this.buildTableStructure()
    this.generateEmptyData()
    this.populateTableData()
    this.bindEvents()
  }

  /**
   * Обновление данных без изменения структуры
   */
  updateData(newData: number[][]): void {
    console.log('Updating table data:', newData)
    
    if (!this.validateDataDimensions(newData)) {
      console.error('Data dimensions do not match table structure')
      return
    }
    
    this.data.data = newData.map(row => [...row]) // Глубокое копирование
    this.populateTableData()
  }

  /**
   * Обновление заголовков
   */
  updateHeaders(rowHeaders?: string[], colHeaders?: string[]): void {
    console.log('Updating table headers')
    
    if (rowHeaders) {
      this.data.rowHeaders = [...rowHeaders]
    } else {
      this.generateDefaultHeaders()
    }
    
    if (colHeaders) {
      this.data.colHeaders = [...colHeaders]
    }
    
    this.renderHeaders()
  }

  /**
   * Установка выделений ячеек
   */
  setSelections(selections: Record<string, string>): void {
    console.log('Setting cell selections:', selections)
    
    this.data.cellSelections = { ...selections }
    this.applyCellSelections()
  }

  /**
   * Очистка всех выделений
   */
  clearSelections(): void {
    console.log('Clearing all selections')
    
    this.data.cellSelections = {}
    this.applyCellSelections()
    this.notifySelectionChange()
  }

  /**
   * Получение текущих выделений
   */
  getSelections(): Record<string, string> {
    return { ...this.data.cellSelections }
  }

  /**
   * Получение статистики по категориям
   */
  getCategoryStatistics(): Array<{
    id: string
    name: string
    color: string
    count: number
    average: number
  }> {
    return this.categories.map(category => {
      let count = 0
      let sum = 0
      
      for (const cellKey in this.data.cellSelections) {
        if (this.data.cellSelections[cellKey] === category.id) {
          const [row, col] = cellKey.split('-').map(Number)
          if (typeof row === 'number' && typeof col === 'number') {
            const value = this.data.data[row]?.[col]
            if (value !== undefined) {
              sum += value
              count++
            }
          }
        }
      }
      
      return {
        ...category,
        count,
        average: count > 0 ? sum / count : 0
      }
    })
  }

  // ПРИВАТНЫЕ МЕТОДЫ ПОСТРОЕНИЯ

  private buildTableStructure(): void {
    if (!this.tableElement) return
    
    // Очищаем таблицу
    this.tableElement.innerHTML = ''
    
    // Создаем thead
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    
    // Пустая ячейка в углу
    const cornerCell = document.createElement('th')
    cornerCell.className = 'sticky-column sticky-header'
    headerRow.appendChild(cornerCell)
    
    // Заголовки колонок
    for (let col = 0; col < this.data.cols; col++) {
      const th = document.createElement('th')
      th.className = 'sticky-header'
      th.dataset.col = col.toString()
      headerRow.appendChild(th)
    }
    
    // Заголовки категорий
    this.categories.forEach(category => {
      const th = document.createElement('th')
      th.className = 'sticky-header average-header'
      th.style.backgroundColor = this.lightenColor(category.color, 0.6)
      th.textContent = category.name
      headerRow.appendChild(th)
    })
    
    thead.appendChild(headerRow)
    this.tableElement.appendChild(thead)
    
    // Создаем tbody
    const tbody = document.createElement('tbody')
    
    // Обычные строки данных
    for (let row = 0; row < this.data.rows; row++) {
      const tr = document.createElement('tr')
      
      // Заголовок строки
      const rowHeader = document.createElement('td')
      rowHeader.className = 'sticky-column row-header'
      rowHeader.dataset.row = row.toString()
      tr.appendChild(rowHeader)
      
      // Ячейки данных
      for (let col = 0; col < this.data.cols; col++) {
        const td = document.createElement('td')
        td.className = 'data-cell'
        td.dataset.row = row.toString()
        td.dataset.col = col.toString()
        tr.appendChild(td)
      }
      
      // Средние по категориям для строки
      this.categories.forEach(category => {
        const td = document.createElement('td')
        td.className = 'average-cell'
        td.style.backgroundColor = this.lightenColor(category.color, 0.4)
        td.dataset.row = row.toString()
        td.dataset.category = category.id
        tr.appendChild(td)
      })
      
      tbody.appendChild(tr)
    }
    
    // Строка средних по категориям (добавляется динамически)
    const avgRow = document.createElement('tr')
    avgRow.className = 'category-averages-row hidden'
    avgRow.dataset.avgRow = 'true'
    
    // Заголовок строки средних
    const avgHeader = document.createElement('td')
    avgHeader.className = 'sticky-column averages-header'
    avgHeader.textContent = 'Средние по категориям'
    avgRow.appendChild(avgHeader)
    
    // Простые средние по колонкам
    for (let col = 0; col < this.data.cols; col++) {
      const td = document.createElement('td')
      td.className = 'simple-average-cell'
      td.dataset.avgCol = col.toString()
      avgRow.appendChild(td)
    }
    
    // Общие средние по категориям
    this.categories.forEach(category => {
      const td = document.createElement('td')
      td.className = 'total-category-average'
      td.style.backgroundColor = this.lightenColor(category.color, 0.4)
      td.dataset.avgCategory = category.id
      avgRow.appendChild(td)
    })
    
    tbody.appendChild(avgRow)
    this.tableElement.appendChild(tbody)
  }

  private generateEmptyData(): void {
    this.data.data = Array(this.data.rows).fill(null).map(() => 
      Array(this.data.cols).fill(0).map(() => Math.random() * 255)
    )
  }

  private populateTableData(): void {
    if (!this.tableElement) return
    
    // Заполняем ячейки данными
    this.data.data.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cell = this.tableElement!.querySelector(
          `td[data-row="${rowIndex}"][data-col="${colIndex}"]:not(.average-cell):not(.simple-average-cell)`
        ) as HTMLTableCellElement
        
        if (cell) {
          cell.textContent = value.toFixed(3)
        }
      })
    })
    
    // Обновляем средние по строкам для категорий
    this.updateRowAverages()
    
    // Обновляем строку общих средних
    this.updateAverageRow()
  }

  private renderHeaders(): void {
    if (!this.tableElement) return
    
    // Обновляем заголовки колонок
    this.data.colHeaders.forEach((header, index) => {
      const th = this.tableElement!.querySelector(`th[data-col="${index}"]`)
      if (th) {
        th.textContent = header
      }
    })
    
    // Обновляем заголовки строк
    this.data.rowHeaders.forEach((header, index) => {
      const td = this.tableElement!.querySelector(`td[data-row="${index}"].row-header`)
      if (td) {
        td.textContent = header
      }
    })
  }

  private generateDefaultHeaders(): void {
    this.data.rowHeaders = Array.from({ length: this.data.rows }, (_, i) => `Строка ${i + 1}`)
    this.data.colHeaders = Array.from({ length: this.data.cols }, (_, i) => `Колонка ${i + 1}`)
  }

  private applyCellSelections(): void {
    if (!this.tableElement) return
    
    // Сбрасываем все стили
    this.tableElement.querySelectorAll('.data-cell').forEach(cell => {
      const td = cell as HTMLTableCellElement
      td.style.backgroundColor = 'transparent'
    })
    
    // Применяем выделения
    for (const cellKey in this.data.cellSelections) {
      const categoryId = this.data.cellSelections[cellKey]
      const category = this.categories.find(cat => cat.id === categoryId)
      
      if (category) {
        const [row, col] = cellKey.split('-').map(Number)
        const cell = this.tableElement.querySelector(
          `td[data-row="${row}"][data-col="${col}"].data-cell`
        ) as HTMLTableCellElement
        
        if (cell) {
          cell.style.backgroundColor = this.lightenColor(category.color, 0.7)
        }
      }
    }
    
    // Обновляем видимость строки средних
    const hasSelections = Object.keys(this.data.cellSelections).length > 0
    const avgRow = this.tableElement.querySelector('[data-avg-row="true"]') as HTMLTableRowElement
    if (avgRow) {
      avgRow.classList.toggle('hidden', !hasSelections)
    }
    
    // Обновляем средние
    this.updateRowAverages()
    this.updateAverageRow()
  }

  private updateRowAverages(): void {
    if (!this.tableElement) return
    
    for (let rowIndex = 0; rowIndex < this.data.rows; rowIndex++) {
      this.categories.forEach(category => {
        const average = this.getRowAverageByCategory(rowIndex, category.id)
        const cell = this.tableElement!.querySelector(
          `td[data-row="${rowIndex}"][data-category="${category.id}"]`
        ) as HTMLTableCellElement
        
        if (cell) {
          cell.textContent = average.toFixed(3)
        }
      })
    }
  }

  private updateAverageRow(): void {
    if (!this.tableElement) return
    
    // Обновляем простые средние по колонкам
    for (let col = 0; col < this.data.cols; col++) {
      const average = this.getColumnAverage(col)
      const cell = this.tableElement.querySelector(
        `td[data-avg-col="${col}"]`
      ) as HTMLTableCellElement
      
      if (cell) {
        cell.textContent = average.toFixed(3)
      }
    }
    
    // Обновляем общие средние по категориям
    this.categories.forEach(category => {
      const average = this.getTotalCategoryAverage(category.id)
      const cell = this.tableElement!.querySelector(
        `td[data-avg-category="${category.id}"]`
      ) as HTMLTableCellElement
      
      if (cell) {
        cell.textContent = average.toFixed(3)
      }
    })
  }

  private bindEvents(): void {
    if (!this.tableElement) return
    
    // Удаляем старые обработчики
    this.tableElement.removeEventListener('click', this.handleCellClick)
    this.tableElement.removeEventListener('contextmenu', this.handleCellContextMenu)
    
    // Добавляем новые
    this.tableElement.addEventListener('click', this.handleCellClick.bind(this))
    this.tableElement.addEventListener('contextmenu', this.handleCellContextMenu.bind(this))
  }

  private handleCellClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.classList.contains('data-cell')) return
    
    const row = parseInt(target.dataset.row || '-1')
    const col = parseInt(target.dataset.col || '-1')
    
    if (row >= 0 && col >= 0) {
      this.toggleCellSelection(row, col)
    }
  }

  private handleCellContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    const target = event.target as HTMLElement
    if (!target.classList.contains('data-cell')) return
    
    const row = parseInt(target.dataset.row || '-1')
    const col = parseInt(target.dataset.col || '-1')
    
    if (row >= 0 && col >= 0) {
      this.showCellMenu(event, row, col)
    }
  }

  private toggleCellSelection(row: number, col: number): void {
    const cellKey = `${row}-${col}`
    const primaryCategory = this.categories[0] // Эпидермис по умолчанию
    
    if (this.data.cellSelections[cellKey] === primaryCategory?.id) {
      delete this.data.cellSelections[cellKey]
    } else {
      this.data.cellSelections[cellKey] = primaryCategory?.id || ''
    }
    
    this.applyCellSelections()
    this.notifySelectionChange()
  }

  private showCellMenu(event: MouseEvent, row: number, col: number): void {
    // Здесь можно добавить логику контекстного меню
    console.log(`Context menu for cell [${row}][${col}]`)
  }

  private notifySelectionChange(): void {
    if (this.onSelectionChange) {
      this.onSelectionChange({ ...this.data.cellSelections })
    }
  }

  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ

  private validateDataDimensions(data: number[][]): boolean {
    return data.length === this.data.rows && 
           data.every(row => row.length === this.data.cols)
  }

  private getRowAverageByCategory(rowIndex: number, categoryId: string): number {
    let sum = 0
    let count = 0
    
    for (let colIndex = 0; colIndex < this.data.cols; colIndex++) {
      const cellKey = `${rowIndex}-${colIndex}`
      if (this.data.cellSelections[cellKey] === categoryId) {
        const value = this.data.data[rowIndex]?.[colIndex]
        if (value !== undefined) {
          sum += value
          count++
        }
      }
    }
    
    return count > 0 ? sum / count : 0
  }

  private getColumnAverage(colIndex: number): number {
    let sum = 0
    let count = 0
    
    for (let rowIndex = 0; rowIndex < this.data.rows; rowIndex++) {
      const value = this.data.data[rowIndex]?.[colIndex]
      if (value !== undefined && !isNaN(value)) {
        sum += value
        count++
      }
    }
    
    return count > 0 ? sum / count : 0
  }

  private getTotalCategoryAverage(categoryId: string): number {
    let sum = 0
    let count = 0
    
    for (const cellKey in this.data.cellSelections) {
      if (this.data.cellSelections[cellKey] === categoryId) {
        const [row, col] = cellKey.split('-').map(Number)
        if (typeof row === 'number' && typeof col === 'number') {
          const value = this.data.data[row]?.[col]
          if (value !== undefined) {
            sum += value
            count++
          }
        }
      }
    }
    
    return count > 0 ? sum / count : 0
  }

  private lightenColor(color: string, factor: number): string {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const newR = Math.round(r + (255 - r) * factor)
    const newG = Math.round(g + (255 - g) * factor)
    const newB = Math.round(b + (255 - b) * factor)
    
    return `rgb(${newR}, ${newG}, ${newB})`
  }

  // ПУБЛИЧНЫЕ СЕТТЕРЫ

  setSelectionChangeHandler(handler: (selections: Record<string, string>) => void): void {
    this.onSelectionChange = handler
  }

  setCategories(categories: TableCategory[]): void {
    this.categories = categories
    this.buildTableStructure()
    this.populateTableData()
    this.applyCellSelections()
    this.bindEvents()
  }

  destroy(): void {
    if (this.tableElement) {
      this.tableElement.removeEventListener('click', this.handleCellClick)
      this.tableElement.removeEventListener('contextmenu', this.handleCellContextMenu)
    }
  }
}