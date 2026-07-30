import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'

vi.mock('@prisma/client', () => {
  const mockPrisma = {
    job: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    scrapeLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  }
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  }
})

const prisma = new PrismaClient()

describe('Jobs Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createJob', () => {
    it('should create a job with valid data', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        platform: 'linkedin',
        url: 'https://linkedin.com/jobs/123',
        description: 'Desenvolvedor full stack',
        location: 'São Paulo',
        salary: 'R$ 10.000',
      }

      vi.mocked(prisma.job.create).mockResolvedValue({
        id: 'uuid-123',
        ...jobData,
        status: 'discovered',
        columnOrder: 0,
        appliedAt: null,
        cvPath: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prisma.job.create({ data: jobData })

      expect(result.title).toBe('Software Engineer')
      expect(result.company).toBe('Tech Corp')
      expect(result.status).toBe('discovered')
      expect(prisma.job.create).toHaveBeenCalledWith({ data: jobData })
    })

    it('should reject duplicate URLs', async () => {
      const jobData = {
        title: 'Duplicate Job',
        company: 'Tech Corp',
        platform: 'linkedin',
        url: 'https://linkedin.com/jobs/duplicate',
        description: 'Test',
      }

      vi.mocked(prisma.job.create).mockRejectedValue(new Error('Unique constraint failed'))

      await expect(prisma.job.create({ data: jobData })).rejects.toThrow('Unique constraint failed')
    })
  })

  describe('updateJobStatus', () => {
    it('should update job status and column order', async () => {
      const jobId = 'uuid-123'
      const updateData = { status: 'analyzing', columnOrder: 1 }

      vi.mocked(prisma.job.update).mockResolvedValue({
        id: jobId,
        title: 'Software Engineer',
        company: 'Tech Corp',
        platform: 'linkedin',
        url: 'https://linkedin.com/jobs/123',
        description: 'Descrição',
        salary: null,
        location: 'São Paulo',
        status: 'analyzing',
        columnOrder: 1,
        appliedAt: null,
        cvPath: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prisma.job.update({ where: { id: jobId }, data: updateData })

      expect(result.status).toBe('analyzing')
      expect(result.columnOrder).toBe(1)
      expect(prisma.job.update).toHaveBeenCalledWith({ where: { id: jobId }, data: updateData })
    })

    it('should set appliedAt when status changes to applied', async () => {
      const jobId = 'uuid-456'
      const now = new Date()
      const updateData = { status: 'applied', appliedAt: now }

      vi.mocked(prisma.job.update).mockResolvedValue({
        id: jobId,
        title: 'Job',
        company: 'Company',
        platform: 'indeed',
        url: 'https://indeed.com/job/456',
        description: 'Desc',
        salary: null,
        location: null,
        status: 'applied',
        columnOrder: 0,
        appliedAt: now,
        cvPath: '/cvs/job-456.pdf',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await prisma.job.update({ where: { id: jobId }, data: updateData })

      expect(result.status).toBe('applied')
      expect(result.appliedAt).toBeInstanceOf(Date)
    })
  })

  describe('listJobs', () => {
    it('should filter jobs by status', async () => {
      const mockJobs = [
        { id: '1', title: 'Dev', company: 'Co', platform: 'linkedin', url: 'url1', description: 'desc', salary: null, location: null, status: 'discovered', columnOrder: 0, appliedAt: null, cvPath: null, notes: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs)

      const result = await prisma.job.findMany({ where: { status: 'discovered' }, orderBy: { columnOrder: 'asc' } })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('discovered')
      expect(prisma.job.findMany).toHaveBeenCalledWith({ where: { status: 'discovered' }, orderBy: { columnOrder: 'asc' } })
    })
  })
})
