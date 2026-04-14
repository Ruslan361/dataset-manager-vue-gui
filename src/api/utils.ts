export function blobToBase64(blob: Blob): Promise<string> {
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

export interface PollOptions {
  interval?: number
  maxAttempts?: number
}

export async function pollUntilDone<T extends { status: string; error?: string }>(
  statusUrl: string,
  completedStatus: string,
  failedStatus: string,
  options: PollOptions = {}
): Promise<T> {
  const { interval = 1000, maxAttempts = 60 } = options
  let attempt = 0

  while (attempt < maxAttempts) {
    const response = await fetch(statusUrl)
    if (!response.ok) throw new Error(`Failed to check status: ${response.status}`)
    const data: T = await response.json()
    if (data.status === completedStatus) return data
    if (data.status === failedStatus) throw new Error(data.error || 'Task failed')
    await new Promise(resolve => setTimeout(resolve, interval))
    attempt++
  }
  throw new Error('Task timed out')
}
