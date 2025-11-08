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
}

const API_BASE_URL = 'http://localhost:8000/api/v1/IO'

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

  async removeDataset(datasetId: number): Promise<ResultResponse> {
    const response = await fetch(`${API_BASE_URL}/dataset/remove-dataset/${datasetId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

export const datasetsAPI = new DatasetsAPI()