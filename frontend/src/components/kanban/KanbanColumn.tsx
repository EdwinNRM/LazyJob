import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { JobCard } from './JobCard'
import { Job, Column } from '../../types'

interface KanbanColumnProps {
  column: Column
  jobs: Job[]
  onJobClick: (job: Job) => void
  onJobDoubleClick: (job: Job) => void
}

export function KanbanColumn({
  column,
  jobs,
  onJobClick,
  onJobDoubleClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      className={`kanban-column ${column.color} border-t-4 min-w-[280px] w-[280px] shrink-0`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-semibold text-sm text-gray-700">{column.title}</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
          {jobs.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 min-h-[200px] rounded-lg transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''
        }`}
      >
        <SortableContext
          items={jobs.map((j) => j.id)}
          strategy={verticalListSortingStrategy}
        >
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
              <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Nenhuma vaga</span>
            </div>
          ) : (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => onJobClick(job)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
