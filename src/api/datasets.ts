import { IO_URL as API_BASE_URL } from './config'
import { pollUntilDone } from './utils'

export interface Dataset {
  id: number
  title: string
  description: string
  created_at: string
  updated_at: string
}

export interface CreateDatasetForm {
  title: string
  description?: string
}

export interface UpdateDatasetForm {
  title?: string
  description?: string
}

export interface GetDatasetsListRequest {
  start: number
  end: number
  sort_field?: 'id' | 'title' | 'description' | 'created_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

export interface ResponseDatasetsList {
  datasets: Dataset[]
  total: number
  start: number
  end: number
}

export interface ResultResponse {
  success: boolean
  message: string
  dataset_id?: number
}

export interface TaskStartResponse {
  task_id: string
  status: string
}

export interface TaskStatusResponse {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  message: string
  error?: string
}

class DatasetsAPI {
  async getDatasetsList(params: GetDatasetsListRequest): Promise<ResponseDatasetsList> {
    const response = await fetch(`${API_BASE_URL}/dataset/get-datasets-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async createDataset(dataset: CreateDatasetForm): Promise<ResultResponse> {
    const response = await fetch(`${API_BASE_URL}/dataset/create-dataset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataset),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async updateDataset(datasetId: number, dataset: UpdateDatasetForm): Promise<ResultResponse> {
    const response = await fetch(`${API_BASE_URL}/dataset/update-dataset/${datasetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataset),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const updatedDataset = await response.json()
    return {
      success: true,
      message: 'Dataset updated successfully',
      dataset_id: updatedDataset.id,
    }
  }

  async removeDataset(datasetId: number): Promise<ResultResponse> {
    const response = await fetch(`${API_BASE_URL}/dataset/remove-dataset/${datasetId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Экспорт датасета.
   * 1. Запуск задачи
   * 2. Ожидание
   * 3. Возврат ссылки на скачивание (без fetch!)
   */
  async exportDataset(datasetId: number): Promise<string> { // <--- Возвращаем string (URL)
    // 1. Запуск задачи
    const startResponse = await fetch(`${API_BASE_URL}/archive/export/${datasetId}`, {
      method: 'POST',
    })

    if (!startResponse.ok) {
      const err = await startResponse.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to start export task: ${startResponse.status}`)
    }

    const startData: TaskStartResponse = await startResponse.json()
    const taskId = startData.task_id

    // 2. Опрос статуса (Polling)
    await pollUntilDone<TaskStatusResponse>(
      `${API_BASE_URL}/archive/status/${taskId}`,
      'completed',
      'failed'
    )

    return `${API_BASE_URL}/archive/download/${taskId}`
  }

  async importDataset(file: File): Promise<ResultResponse> {
    const formData = new FormData()
    formData.append('file', file)

    // Исправлен путь на /archive/import
    const response = await fetch(`${API_BASE_URL}/archive/import`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

export const datasetsAPI = new DatasetsAPI()