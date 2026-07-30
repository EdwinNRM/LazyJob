import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
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
  const updateJobStatus = useUpdateJobStatus()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
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
      const job = jobs.find((j) => j.id === event.active.id)
      if (job) setActiveJob(job)
    },
    [jobs]
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeStatus = findColumn(active.id as string)
    let overStatus: JobStatus | null = null

    if (COLUMNS.some((c) => c.id === over.id)) {
      overStatus = over.id as JobStatus
    } else {
      overStatus = findColumn(over.id as string)
    }

    if (activeStatus && overStatus && activeStatus !== overStatus) {
      const activeIndex = jobs.findIndex((j) => j.id === active.id)
      if (activeIndex !== -1) {
        const updatedJobs = [...jobs]
        updatedJobs[activeIndex] = {
          ...updatedJobs[activeIndex],
          status: overStatus,
        }
      }
    }
  }, [jobs, findColumn])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveJob(null)

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
        })
      }
    },
    [jobs, findColumn, updateJobStatus]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            jobs={getColumnJobs(column.id)}
            onJobClick={onJobDetail}
            onJobDoubleClick={onJobDetail}
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
