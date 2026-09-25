import { Router } from 'express'
import type { PrismaClient } from '@prisma/client'
import { beginScrape } from '../services/scrape-run'
import { classifyJob } from '../services/classification'
export function scraperRoutes(prisma: PrismaClient) {
 const router = Router()
 router.post('/run', async (req, res) => {
  try { const run = await beginScrape(prisma, req.body); res.status(202).json({ message: 'Coleta iniciada', runId: run.id }) }
  catch (error) { res.status((error as {status?:number}).status || 400).json({ error: error instanceof Error ? error.message : 'Configuração de busca inválida' }) }
 })
 router.get('/logs', async (_req, res) => { res.json(await prisma.scrapeLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })) })
 router.get('/runs/latest', async (_req, res) => {
  const run = await prisma.scrapeRun.findFirst({ orderBy: { createdAt: 'desc' } })
  res.json(run ? { ...run, sources: JSON.parse(run.sources) } : null)
 })
 router.get('/runs/:id', async (req, res) => {
  const run = await prisma.scrapeRun.findUnique({ where: { id: req.params.id } })
  if (!run) return res.status(404).json({ error: 'Execução não encontrada' })
  res.json({ ...run, sources: JSON.parse(run.sources) })
 })
 router.post('/reclassify', async (_req, res) => {
  const jobs = await prisma.job.findMany({ where: { platform: { not: 'manual' } } })
  let accepted = 0
  for (const job of jobs) {
   const result = classifyJob(job)
   if (result.accepted) accepted++
   await prisma.job.update({ where: { id: job.id }, data: {
    workMode: result.workMode, brazilEligible: result.brazilEligible, isTech: result.isTech,
    classificationStatus: result.accepted ? 'accepted' : result.confidence < 0.7 ? 'pending' : 'excluded',
    classificationConfidence: result.confidence, classificationReason: result.reason,
    seniority: result.seniority, technologies: JSON.stringify(result.technologies),
   } })
  }
  res.json({ processed: jobs.length, accepted, excludedOrPending: jobs.length - accepted })
 })
 return router
}
