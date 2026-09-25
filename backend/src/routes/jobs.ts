import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { createJobSchema, updateJobSchema } from '../lib/validation'
import fs from 'fs'
import { generateCvVersion, updateCvVersion, isGenerating } from '../services/cv-engine/workflow'

export function jobRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (req, res) => {
    try {
      const { status, platform, query, includeExcluded } = req.query
      const where: Record<string, unknown> = includeExcluded === 'true' ? {} : { OR: [{ classificationStatus: { not: 'excluded' } }, { status: { notIn: ['discovered','rejected'] } }] }

      if (typeof status === 'string') where.status = status
      if (typeof platform === 'string') where.platform = platform
      if (typeof query === 'string' && query) {
        where.AND = [{ OR: [
          { title: { contains: query as string } },
          { company: { contains: query as string } },
          { description: { contains: query as string } },
        ] }]
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

      if (data.status === 'applied' && !previousJob.appliedAt && typeof data.appliedAt === 'undefined') {
        (data as Record<string, unknown>).appliedAt = new Date().toISOString()
      }

      if (data.status && data.status !== 'applied' && previousJob.status === 'applied') data.appliedAt = null
      const job = await prisma.job.update({
        where: { id: req.params.id },
        data,
      })

      if (data.status === 'adjusting_cv' && previousJob.status !== 'adjusting_cv') {
        generateCvVersion(prisma, job.id).catch((error) => console.error('[CV]', error))
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
      res.status(404).json({ error: 'Vaga não encontrada' })
    }
  })

  router.get('/:id/cv', async (req, res) => {
    const versions = await prisma.cvVersion.findMany({ where: { jobId: req.params.id }, orderBy: { createdAt: 'desc' } })
    res.json(versions.map((v) => ({ ...v, atsReport: JSON.parse(v.atsReport) })))
  })

  router.post('/:id/cv/generate', async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ error: 'Vaga não encontrada' })
    if (isGenerating(job.id)) return res.status(409).json({ error: 'Já existe uma geração em andamento' })
    res.status(202).json({ message: 'Geração de currículo iniciada' })
    generateCvVersion(prisma, job.id).catch((error) => console.error('[CV]', error))
  })

  router.put('/:id/cv/:versionId', async (req, res) => {
    try {
      if (typeof req.body.optimizedText !== 'string' || req.body.optimizedText.length > 100000) return res.status(400).json({ error: 'Texto inválido (limite: 100.000 caracteres)' })
      if (isGenerating(req.params.id)) return res.status(409).json({ error: 'Aguarde a geração em andamento' })
      const optimizedText = req.body.optimizedText.trim()
      if (!optimizedText) return res.status(400).json({ error: 'O currículo não pode ficar vazio' })
      const version = await updateCvVersion(prisma, req.params.id, req.params.versionId, optimizedText)
      res.json({ ...version, atsReport: JSON.parse(version.atsReport) })
    } catch (error) {
      res.status(String(error).includes('não encontrada') ? 404 : 400).json({ error: String(error) })
    }
  })

  router.get('/:id/cv/:versionId/download', async (req, res) => {
    const version = await prisma.cvVersion.findFirst({ where: { id: req.params.versionId, jobId: req.params.id } })
    if (!version || !fs.existsSync(version.pdfPath)) return res.status(404).json({ error: 'PDF não encontrado' })
    res.download(version.pdfPath, `curriculo-${req.params.id}.pdf`)
  })

  return router
}
