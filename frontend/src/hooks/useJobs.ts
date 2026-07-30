import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchJobs,
  fetchJob,
  updateJobStatus,
  deleteJob,
  triggerApply,
  createJob,
} from '../services/api'
import { Job } from '../types'

export function useJobs(params?: {
  status?: string
  platform?: string
  query?: string
}) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => fetchJobs(params),
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id),
    enabled: !!id,
  })
}

export function useCreateJob(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onSuccess?.()
    },
  })
}

export function useUpdateJobStatus(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: Partial<Job> }) =>
      updateJobStatus(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onSuccess?.()
    },
  })
}

export function useDeleteJob(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onSuccess?.()
    },
  })
}

export function useTriggerApply(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: triggerApply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onSuccess?.()
    },
  })
}
