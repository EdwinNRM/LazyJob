import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useJobs, useUpdateJobStatus } from './useJobs'
import * as api from '../services/api'
import { Job } from '../types'

vi.mock('../services/api', () => ({
  fetchJobs: vi.fn(),
  updateJobStatus: vi.fn(),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useJobs', () => {
  it('should return jobs list', async () => {
    const mockJobs: Job[] = [
      { id: '1', title: 'Dev', company: 'Co', platform: 'linkedin', url: 'url', description: 'desc', status: 'discovered', columnOrder: 0, appliedAt: null, cvPath: null, notes: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', location: null, salary: null },
    ]
    vi.mocked(api.fetchJobs).mockResolvedValue(mockJobs)

    const { result } = renderHook(() => useJobs(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockJobs)
  })

  it('should handle fetch error', async () => {
    vi.mocked(api.fetchJobs).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useJobs(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useUpdateJobStatus', () => {
  it('should call updateJobStatus with correct params', async () => {
    vi.mocked(api.updateJobStatus).mockResolvedValue(undefined as unknown as Job)

    const { result } = renderHook(() => useUpdateJobStatus(), { wrapper })

    result.current.mutate({ jobId: '1', data: { status: 'applied' } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(api.updateJobStatus).toHaveBeenCalledWith('1', { status: 'applied' })
  })
})
