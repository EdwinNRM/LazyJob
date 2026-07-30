import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { createJobSchema, updateJobSchema } from '../lib/validation'
import { applyForJob } from '../services/apply'

export function jobRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    try {
      const { status, platform, query } = req.query
      const where: Record<string, unknown> = {}

      if (status) where.status = status
      if (platform) where.platform = platform
      if (query) {
        where.OR = [
          { title: { contains: query as string } },
          { company: { contains: query as string } },
          { description: { contains: query as string } },
        ]
      }

      const jobs = await prisma.job.findMany({
        where,
        orderBy: [{ columnOrder: 'asc' }, { createdAt: 'desc' }],
      })

      res.json(jobs)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar vagas' })
    }
  })

  router.get('/:id', async (req, res) => {
    try {
      const job = await prisma.job.findUnique({
        where: { id: req.params.id },
      })

      if (!job) {
        return res.status(404).json({ error: 'Vaga não encontrada' })
      }

      res.json(job)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar vaga' })
    }
  })

  router.post('/', async (req, res) => {
    try {
      const data = createJobSchema.parse(req.body)
      const job = await prisma.job.create({ data })
      res.status(201).json(job)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return res.status(409).json({ error: 'Vaga já existe com esta URL' })
      }
      res.status(400).json({ error: 'Dados inválidos', details: error })
    }
  })

  router.patch('/:id', async (req, res) => {
    try {
      const data = updateJobSchema.parse(req.body)
      const previousJob = await prisma.job.findUnique({ where: { id: req.params.id } })

      if (!previousJob) {
        return res.status(404).json({ error: 'Vaga não encontrada' })
      }

      if (data.status === 'applied' && typeof data.appliedAt === 'undefined') {
        (data as Record<string, unknown>).appliedAt = new Date().toISOString()
      }

      const job = await prisma.job.update({
        where: { id: req.params.id },
        data,
      })

      if (data.status === 'applying') {
        applyForJob(prisma, job).catch(console.error)
      }

      res.json(job)
    } catch (error) {
      res.status(400).json({ error: 'Erro ao atualizar vaga', details: error })
    }
  })

  router.delete('/:id', async (req, res) => {
    try {
      await prisma.job.delete({ where: { id: req.params.id } })
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover vaga' })
    }
  })

  router.post('/:id/apply', async (req, res) => {
    try {
      const job = await prisma.job.findUnique({ where: { id: req.params.id } })

      if (!job) {
        return res.status(404).json({ error: 'Vaga não encontrada' })
      }

      res.json({ message: 'Candidatura iniciada', jobId: job.id })

      applyForJob(prisma, job).catch(console.error)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao iniciar candidatura' })
    }
  })

  return router
}
