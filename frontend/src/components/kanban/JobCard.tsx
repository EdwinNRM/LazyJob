import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback } from 'react'
import { Job } from '../../types'

interface JobCardProps {
  job: Job
  onClick?: () => void
  lastDragEnd?: React.MutableRefObject<number>
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  gupy: 'Gupy',
  glassdoor: 'Glassdoor',
  nerdin: 'Nerdin', rss: 'RSS', api: 'API', manual: 'Manual',
}

export function JobCard({ job, onClick, lastDragEnd }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none' as const,
  }

  const handleClick = useCallback(() => {
    if (lastDragEnd && Date.now() - lastDragEnd.current < 300) return
    onClick?.()
  }, [onClick, lastDragEnd])

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 flex-1">
          {job.title}
        </h3>
        <span className={`badge badge-${job.platform} ml-2 shrink-0`}>
          {PLATFORM_LABELS[job.platform] || job.platform}
        </span>
      </div>

      <p className="text-xs text-gray-600 mb-2">{job.company}</p>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {job.location && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {job.location}
          </span>
        )}
        {job.salary && (
          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {job.salary}
          </span>
        )}
      </div>

      {job.appliedAt && (
        <p className="text-xs text-gray-400 mt-2">
          Candidatado em {new Date(job.appliedAt).toLocaleDateString('pt-BR')}
        </p>
      )}
      {job.cvStatus === 'generating' && <p className="text-xs text-purple-600 mt-2">Gerando currículo…</p>}
      {job.cvStatus === 'error' && <p className="text-xs text-red-600 mt-2" title={job.cvError || ''}>Erro ao gerar currículo</p>}
      {job.cvStatus === 'ready' && <p className="text-xs text-green-600 mt-2">Currículo disponível para revisão</p>}
    </div>
  )
}
