import toast from 'react-hot-toast'
import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core'
import { useUpdateJobStatus } from '../../hooks/useJobs'
import { KanbanColumn } from './KanbanColumn'
import { JobCard } from './JobCard'
import { Job, COLUMNS, JobStatus } from '../../types'

interface KanbanBoardProps {
  jobs: Job[]
  onJobDetail: (job: Job) => void
}

export function KanbanBoard({ jobs, onJobDetail }: KanbanBoardProps) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const lastDragEnd = useRef(0)
  const updateJobStatus = useUpdateJobStatus()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getColumnJobs = useCallback(
    (status: JobStatus) =>
      jobs
        .filter((j) => j.status === status)
        .sort((a, b) => a.columnOrder - b.columnOrder),
    [jobs]
  )

  const findColumn = useCallback(
    (jobId: string): JobStatus | null => {
      const job = jobs.find((j) => j.id === jobId)
      return job?.status ?? null
    },
    [jobs]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      lastDragEnd.current = 0
      const job = jobs.find((j) => j.id === event.active.id)
      if (job) setActiveJob(job)
    },
    [jobs]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveJob(null)
      lastDragEnd.current = Date.now()

      if (!over) return

      const activeStatus = findColumn(active.id as string)
      let newStatus: JobStatus | null = null

      if (COLUMNS.some((c) => c.id === over.id)) {
        newStatus = over.id as JobStatus
      } else {
        newStatus = findColumn(over.id as string)
      }

      if (activeStatus && newStatus && activeStatus !== newStatus) {
        updateJobStatus.mutate({
          jobId: active.id as string,
          data: {
            status: newStatus,
            columnOrder: jobs.filter((j) => j.status === newStatus).length,
          },
        }, { onError: error => toast.error(error.message) })
      }
    },
    [jobs, findColumn, updateJobStatus]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 h-full">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            jobs={getColumnJobs(column.id)}
            onJobClick={onJobDetail}
            onJobDoubleClick={onJobDetail}
            lastDragEnd={lastDragEnd}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob ? (
          <div className="rotate-3">
            <JobCard job={activeJob} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}