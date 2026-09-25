export type JobStatus = 'discovered' | 'analyzing' | 'adjusting_cv' | 'ready_to_apply' | 'applied' | 'rejected'
export type Platform = 'linkedin' | 'indeed' | 'gupy' | 'glassdoor' | 'nerdin' | 'rss' | 'api' | 'manual'

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
  cvStatus?: 'idle' | 'generating' | 'ready' | 'error'
  cvError?: string | null
  activeCvVersionId?: string | null
  workMode?: string | null
  brazilEligible?: boolean
  isTech?: boolean
  classificationStatus?: string
  classificationConfidence?: number
  classificationReason?: string | null
  seniority?: string | null
  technologies?: string | null
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
  { id: 'ready_to_apply', title: 'Pronta para candidatura', color: 'border-t-orange-500' },
  { id: 'applied', title: 'Candidatada', color: 'border-t-green-500' },
  { id: 'rejected', title: 'Recusada / Arquivada', color: 'border-t-red-500' },
]

export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'none'

export interface Settings {
  cvBasePath: string
  llmProvider: LLMProvider
  llmModel: string
  llmBaseUrl: string
  llmApiKey: string
  searchQueries: string[]
  searchLocations: string[]
  enabledSources: string
  rssUrls: string
  publicApiUrls: string
  [key: string]: unknown
}

export interface AtsReport { score: number; matchedKeywords: string[]; missingKeywords: string[]; warnings: string[]; readable: boolean }
export interface CvVersion { id: string; jobId: string; originalText: string; optimizedText: string; pdfPath: string; atsReport: AtsReport; model: string; promptVersion: string; usedFallback: boolean; createdAt: string }
