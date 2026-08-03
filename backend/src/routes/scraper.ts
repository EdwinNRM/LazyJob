import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { scrapeAllPlatforms } from '../services/scraper'
import { DEFAULT_QUERIES, DEFAULT_LOCATIONS } from '../services/scheduler'

export function scraperRoutes(prisma: PrismaClient) {
  const router = Router()

  router.post('/run', async (req, res) => {
    try {
      const { queries = DEFAULT_QUERIES, locations = DEFAULT_LOCATIONS, platforms } = req.body

      const headlessSetting = await prisma.setting.findUnique({
        where: { key: 'browserHeadless' },
      })

      const headless = headlessSetting ? headlessSetting.value !== 'false' : true

      const results = await scrapeAllPlatforms({
        queries,
        locations,
        platforms,
        prisma,
        headless,
      })

      res.json({ message: 'Scrape concluído', resultsCount: results.length })
    } catch (error) {
      console.error('[Scraper] Erro:', error)
      res.status(500).json({ error: 'Erro no scrape', details: String(error) })
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
