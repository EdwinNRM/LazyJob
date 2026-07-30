import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobCard } from './JobCard'

const mockJob = {
  id: '1',
  title: 'Software Engineer',
  company: 'Tech Corp',
  platform: 'linkedin' as const,
  url: 'https://linkedin.com/jobs/1',
  description: 'Vaga para engenheiro de software',
  salary: 'R$ 15.000',
  location: 'São Paulo',
  status: 'discovered' as const,
  columnOrder: 0,
  appliedAt: null,
  cvPath: null,
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('JobCard', () => {
  it('should render job title and company', () => {
    render(<JobCard job={mockJob} />)
    expect(screen.getByText('Software Engineer')).toBeDefined()
    expect(screen.getByText('Tech Corp')).toBeDefined()
  })

  it('should render location and salary when available', () => {
    render(<JobCard job={mockJob} />)
    expect(screen.getByText('São Paulo')).toBeDefined()
    expect(screen.getByText('R$ 15.000')).toBeDefined()
  })

  it('should show platform badge', () => {
    render(<JobCard job={mockJob} />)
    expect(screen.getByText(/linkedin/i)).toBeDefined()
  })

  it('should render without salary when not provided', () => {
    const jobWithoutSalary = { ...mockJob, salary: null }
    render(<JobCard job={jobWithoutSalary} />)
    expect(screen.queryByText('R$')).toBeNull()
  })
})
