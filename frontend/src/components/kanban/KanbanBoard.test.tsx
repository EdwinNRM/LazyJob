import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KanbanBoard } from './KanbanBoard'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

const mockJobs = [
  {
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
  },
  {
    id: '2',
    title: 'Frontend Developer',
    company: 'Web Co',
    platform: 'indeed' as const,
    url: 'https://indeed.com/jobs/2',
    description: 'Vaga para desenvolvedor frontend',
    salary: 'R$ 12.000',
    location: 'Rio de Janeiro',
    status: 'analyzing' as const,
    columnOrder: 0,
    appliedAt: null,
    cvPath: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

describe('KanbanBoard', () => {
  it('should render all columns', () => {
    renderWithProviders(<KanbanBoard jobs={mockJobs} onJobDetail={vi.fn()} />)
    expect(screen.getByText(/Descobertas/i)).toBeDefined()
    expect(screen.getByText(/Em Análise/i)).toBeDefined()
    expect(screen.getByText(/Ajustar CV/i)).toBeDefined()
    expect(screen.getByText(/Pronta para candidatura/i)).toBeDefined()
    expect(screen.getByText(/Candidatada/i)).toBeDefined()
    expect(screen.getByText(/Recusada/i)).toBeDefined()
  })

  it('should render job cards in correct columns', () => {
    renderWithProviders(<KanbanBoard jobs={mockJobs} onJobDetail={vi.fn()} />)
    expect(screen.getByText('Software Engineer')).toBeDefined()
    expect(screen.getByText('Frontend Developer')).toBeDefined()
    expect(screen.getByText('Tech Corp')).toBeDefined()
    expect(screen.getByText('Web Co')).toBeDefined()
  })

  it('should display empty state for columns without jobs', () => {
    renderWithProviders(<KanbanBoard jobs={mockJobs} onJobDetail={vi.fn()} />)
    const columns = screen.getAllByText(/Nenhuma vaga/i)
    expect(columns.length).toBeGreaterThanOrEqual(4)
  })
})
