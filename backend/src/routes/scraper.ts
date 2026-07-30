import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { scrapeAllPlatforms } from '../services/scraper'

export function scraperRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/run', async (req, res) => {
    try {
      const { queries = ['developer'], locations = ['Brasil'], platforms } = req.body

      res.json({ message: 'Scrape iniciado em background' })

      const results = await scrapeAllPlatforms({
        queries,
        locations,
        platforms,
        prisma,
      })

      console.log(`[Scraper] Concluído: ${results.length} vagas encontradas`)
    } catch (error) {
      console.error('[Scraper] Erro:', error)
    }
  })

  router.get('/logs', async (_req, res) => {
    try {
      const logs = await prisma.scrapeLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      res.json(logs)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar logs' })
    }
  })

  return router
}
