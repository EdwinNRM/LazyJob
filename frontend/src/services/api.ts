import { Job } from '../types'

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erro de rede' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export async function fetchJobs(params?: {
  status?: string
  platform?: string
  query?: string
}): Promise<Job[]> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.platform) searchParams.set('platform', params.platform)
  if (params?.query) searchParams.set('query', params.query)

  const qs = searchParams.toString()
  return request<Job[]>(`/jobs${qs ? `?${qs}` : ''}`)
}

export async function fetchJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}`)
}

export async function createJob(job: Partial<Job>): Promise<Job> {
  return request<Job>('/jobs', {
    method: 'POST',
    body: JSON.stringify(job),
  })
}

export async function updateJobStatus(
  jobId: string,
  data: Partial<Job>
): Promise<Job> {
  return request<Job>(`/jobs/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteJob(jobId: string): Promise<void> {
  return request<void>(`/jobs/${jobId}`, { method: 'DELETE' })
}

export async function triggerApply(jobId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/jobs/${jobId}/apply`, {
    method: 'POST',
  })
}

export async function runScrape(data: {
  queries: string[]
  locations?: string[]
  platforms?: string[]
}): Promise<{ message: string; resultsCount?: number }> {
  return request<{ message: string; resultsCount?: number }>('/scrape/run', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchSettings(): Promise<Record<string, string>> {
  return request<Record<string, string>>('/settings')
}

export async function updateSetting(
  key: string,
  value: string
): Promise<void> {
  return request<void>(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export async function fetchScrapeLogs(): Promise<
  Array<{
    id: string
    platform: string
    query: string
    resultsCount: number
    success: boolean
    errorMessage: string | null
    createdAt: string
  }>
> {
  return request('/scrape/logs')
}
