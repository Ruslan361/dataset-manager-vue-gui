export interface Crop{
    top: number
    bottom: number
    left: number
    right: number
}
export interface CropResponse{
    success: boolean
    message: string
    data?: Crop | null
}
export interface AutoCropRequest{
    image_id: number
}

// Сделал базовый URL до "crop" чтобы в вызовах не дублировать сегмент
const API_BASE_URL = 'http://localhost:8000/api/v1/analysis/crop'

class CropAPI {
    private async parseResult<T>(response: Response): Promise<T> {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const json = await response.json() as CropResponse
        if (!json.success) {
            throw new Error(`API error: ${json.message}`)
        }
        if (json.data == null) {
            throw new Error('API returned no data')
        }
        return json.data as unknown as T
    }

    async autoCropImage(params: AutoCropRequest): Promise<Crop> {
        const response = await fetch(`${API_BASE_URL}/auto-crop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        })

        return this.parseResult<Crop>(response)
    }

    async applyCrop(imageId: number, crop: Crop): Promise<{message: string}> {
        const response = await fetch(`${API_BASE_URL}/crop-image/${imageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(crop),
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const json = await response.json()
        return { message: json.message }
    }

    async getCrop(imageId: number): Promise<Crop> {
        const response = await fetch(`${API_BASE_URL}/get-crop/${imageId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        return this.parseResult<Crop>(response)
    }
}

export const cropAPI = new CropAPI()