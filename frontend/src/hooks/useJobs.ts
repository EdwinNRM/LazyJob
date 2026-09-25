import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchJobs,
  fetchJob,
  updateJobStatus,
  deleteJob,
  fetchCvVersions, generateCv, updateCv,
  createJob,
} from '../services/api'
import { Job } from '../types'

export function useJobs(params?: {
  status?: string
  platform?: string
  query?: string
  includeExcluded?: boolean
}) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => fetchJobs(params),
    refetchInterval: 3000,
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id),
    enabled: !!id,
    refetchInterval: 1000,
  })
}

export function useCreateJob(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job'] })
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
      queryClient.invalidateQueries({ queryKey: ['job'] })
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
      queryClient.invalidateQueries({ queryKey: ['job'] })
      onSuccess?.()
    },
  })
}

export function useCvVersions(jobId: string) {
  return useQuery({ queryKey: ['cvVersions', jobId], queryFn: () => fetchCvVersions(jobId), enabled: !!jobId, refetchInterval: 3000 })
}

export function useGenerateCv(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateCv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cvVersions'] }); queryClient.invalidateQueries({ queryKey: ['job'] })
      onSuccess?.()
    },
  })
}

export function useUpdateCv() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ jobId, versionId, optimizedText }: { jobId: string; versionId: string; optimizedText: string }) => updateCv(jobId, versionId, optimizedText), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cvVersions'] }); queryClient.invalidateQueries({ queryKey: ['job'] }) } })
}
