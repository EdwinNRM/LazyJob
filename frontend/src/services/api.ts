import { CvVersion, Job } from '../types'

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
  includeExcluded?: boolean
}): Promise<Job[]> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.platform) searchParams.set('platform', params.platform)
  if (params?.query) searchParams.set('query', params.query)
  if (params?.includeExcluded) searchParams.set('includeExcluded','true')

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

export const fetchCvVersions = (jobId: string) => request<CvVersion[]>(`/jobs/${jobId}/cv`)
export const generateCv = (jobId: string) => request<{ message: string }>(`/jobs/${jobId}/cv/generate`, { method: 'POST' })
export const updateCv = (jobId: string, versionId: string, optimizedText: string) => request<CvVersion>(`/jobs/${jobId}/cv/${versionId}`, { method: 'PUT', body: JSON.stringify({ optimizedText }) })
export const cvDownloadUrl = (jobId: string, versionId: string) => `${API_BASE}/jobs/${jobId}/cv/${versionId}/download`

export async function runScrape(data: {
  queries?: string[]
  locations?: string[]
  platforms?: string[]
}): Promise<{ message: string; runId: string }> {
  return request<{ message: string; runId: string }>('/scrape/run', {
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

export async function fetchBaseCvText(): Promise<{ text: string }> {
  return request<{ text: string }>('/settings/cv-base/preview')
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

export interface ScrapeRun { id: string; status: string; resultsCount: number; errorMessage: string | null; createdAt: string }
export const fetchLatestRun = () => request<ScrapeRun | null>('/scrape/runs/latest')
export const saveSettings = (data: Record<string,string>) => request('/settings', { method: 'PUT', body: JSON.stringify(data) })
