export type JobStatus = 'discovered' | 'analyzing' | 'adjusting_cv' | 'applying' | 'applied' | 'rejected'
export type Platform = 'linkedin' | 'indeed' | 'gupy' | 'glassdoor'

export interface Job {
  id: string
  title: string
  company: string
  platform: Platform
  url: string
  description: string
  salary: string | null
  location: string | null
  status: JobStatus
  columnOrder: number
  appliedAt: string | null
  cvPath: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Column {
  id: JobStatus
  title: string
  color: string
}

export const COLUMNS: Column[] = [
  { id: 'discovered', title: 'Descobertas', color: 'border-t-blue-500' },
  { id: 'analyzing', title: 'Em Análise', color: 'border-t-yellow-500' },
  { id: 'adjusting_cv', title: 'Ajustar CV', color: 'border-t-purple-500' },
  { id: 'applying', title: 'Candidatar', color: 'border-t-orange-500' },
  { id: 'applied', title: 'Candidatada', color: 'border-t-green-500' },
  { id: 'rejected', title: 'Recusada / Arquivada', color: 'border-t-red-500' },
]

export interface Settings {
  cvBasePath: string
  llmProvider: 'openai' | 'anthropic'
  llmApiKey: string
  searchQueries: string[]
  searchLocations: string[]
  autoApplyEnabled: boolean
  browserHeadless: boolean
  [key: string]: unknown
}
