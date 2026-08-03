import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useJobs, useCreateJob, useDeleteJob, useTriggerApply } from '../hooks/useJobs'
import { useSettings } from '../hooks/useSettings'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { runScrape } from '../services/api'
import { Job } from '../types'

export function Dashboard() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<Job | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()
  const { data: jobs, isLoading } = useJobs({ query: searchQuery || undefined })
  const { data: settings } = useSettings()
  const createJob = useCreateJob()
  const deleteJob = useDeleteJob()
  const triggerApply = useTriggerApply()

  const runScrapeMutation = useMutation({
    mutationFn: runScrape,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['scrapeLogs'] })
    },
  })

  const handleRunScrape = useCallback(async () => {
    const queries = settings?.searchQueries
      ? JSON.parse(settings.searchQueries)
      : ['analista de desenvolvimento de sistemas pleno', 'analista de sistemas pleno']

    const locations = settings?.searchLocations
      ? JSON.parse(settings.searchLocations)
      : ['Remoto', 'São José do Rio Preto']

    toast.promise(runScrapeMutation.mutateAsync({ queries, locations }), {
      loading: 'Buscando vagas... (pode levar alguns minutos)',
      success: (data: { resultsCount?: number }) =>
        `Busca concluída! ${data.resultsCount ?? 0} vagas encontradas`,
      error: 'Erro na busca',
    })
  }, [settings, runScrapeMutation])

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">LazyJob</h1>
            <span className="text-sm text-gray-500">
              {jobs?.length || 0} vagas encontradas
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar vagas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            <button onClick={handleRunScrape} className="btn-secondary text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Buscar Vagas
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Vaga
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <KanbanBoard
            jobs={jobs || []}
            onJobDetail={(job) => setShowDetailModal(job)}
          />
        )}
      </main>

      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => {
            createJob.mutate(data, {
              onSuccess: () => {
                setShowAddModal(false)
                toast.success('Vaga adicionada!')
              },
              onError: (err) => toast.error(String(err)),
            })
          }}
        />
      )}

      {showDetailModal && (
        <JobDetailModal
          job={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onDelete={(id) => {
            deleteJob.mutate(id, {
              onSuccess: () => {
                setShowDetailModal(null)
                toast.success('Vaga removida')
              },
            })
          }}
          onApply={(id) => {
            triggerApply.mutate(id, {
              onSuccess: () => {
                toast.success('Candidatura iniciada!')
                setShowDetailModal(null)
              },
            })
          }}
        />
      )}
    </div>
  )
}

function AddJobModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: Partial<Job>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState<Job['platform']>('linkedin')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [salary, setSalary] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ title, company, url, platform, description, location: location || null, salary: salary || null })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Nova Vaga</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as Job['platform'])} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="gupy">Gupy</option>
                <option value="glassdoor">Glassdoor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salário</label>
              <input value={salary} onChange={(e) => setSalary(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="R$" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button type="submit" className="btn-primary text-sm">Adicionar Vaga</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function JobDetailModal({
  job,
  onClose,
  onDelete,
  onApply,
}: {
  job: Job
  onClose: () => void
  onDelete: (id: string) => void
  onApply: (id: string) => void
}) {
  const canApply = job.status !== 'applied' && job.status !== 'applying'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{job.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Empresa</label>
              <p className="font-medium">{job.company}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
              <p className="font-medium capitalize">{job.status.replace('_', ' ')}</p>
            </div>
            {job.location && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Localização</label>
                <p className="font-medium">{job.location}</p>
              </div>
            )}
            {job.salary && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Salário</label>
                <p className="font-medium text-green-600">{job.salary}</p>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Plataforma</label>
              <p className="font-medium capitalize">{job.platform}</p>
            </div>
            {job.appliedAt && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Candidatado em</label>
                <p className="font-medium">{new Date(job.appliedAt).toLocaleString('pt-BR')}</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Descrição</label>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {job.description || 'Sem descrição disponível'}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => window.open(job.url, '_blank')}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Abrir Vaga
              </button>
              <button
                onClick={() => onDelete(job.id)}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Remover
              </button>
            </div>
            {canApply && (
              <button
                onClick={() => onApply(job.id)}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {job.status === 'applying' ? 'Candidatando...' : 'Candidatar-se'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
