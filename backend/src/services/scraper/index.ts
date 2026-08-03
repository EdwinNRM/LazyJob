import { chromium, Page } from 'playwright'
import { PrismaClient } from '@prisma/client'
import { scrapeLinkedIn } from './linkedin'
import { scrapeIndeed } from './indeed'
import { scrapeGupy } from './gupy'
import { scrapeGlassdoor } from './glassdoor'
import { dedupKey, normalizeText } from './utils'
import { readLLMConfig, filterJobsByRelevance, JobForRelevance } from '../llm'

interface ScrapeOptions {
  queries: string[]
  locations?: string[]
  platforms?: ('linkedin' | 'indeed' | 'gupy' | 'glassdoor')[]
  prisma?: PrismaClient
  headless?: boolean
}

interface ScrapedJob {
  title: string
  company: string
  platform: string
  url: string
  description: string
  salary?: string
  location?: string
}

export async function scrapeAllPlatforms(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const { queries, locations = [], platforms, prisma, headless = true } = options

  if (queries.length === 0) return []

  const enabledPlatforms = platforms ?? ['linkedin', 'indeed', 'gupy', 'glassdoor']
  const allResults: ScrapedJob[] = []

  const scrapers: Record<string, (page: Page, q: string, loc: string) => Promise<ScrapedJob[]>> = {
    linkedin: scrapeLinkedIn,
    indeed: scrapeIndeed,
    gupy: scrapeGupy,
    glassdoor: scrapeGlassdoor,
  }

  const existing = prisma
    ? await prisma.job.findMany({ select: { title: true, company: true, platform: true, url: true, status: true } })
    : []

  const existingKeys = new Set(existing.map((j) => dedupKey(j as any)))
  const existingUrls = new Set(existing.map((j) => normalizeText(j.url)))
  const existingAppliedKeys = new Set(
    existing
      .filter((j) => j.status === 'applied' || j.status === 'applying')
      .map((j) => dedupKey(j as any))
  )

  const resultKeys = new Set<string>()
  const resultUrls = new Set<string>()

  let savedCount = 0
  let skippedCount = 0
  let removedByLLM = 0

  const savedJobs: JobForRelevance[] = []

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'pt-BR',
  })

  try {
    for (const platform of enabledPlatforms) {
      const scraper = scrapers[platform]
      if (!scraper) continue

      const page = await context.newPage()

      for (const query of queries) {
        for (const location of locations) {
          const logEntry = prisma
            ? await prisma.scrapeLog.create({
                data: { platform, query, resultsCount: 0, success: false },
              })
            : null

          try {
            console.log(`[Scraper] ${platform}: buscando "${query}" em "${location}"`)
            const results = await scraper(page, query, location)

            for (const job of results) {
              const key = dedupKey(job)
              const urlKey = normalizeText(job.url)

              if (!resultKeys.has(key) && !resultUrls.has(urlKey)) {
                resultKeys.add(key)
                resultUrls.add(urlKey)
                allResults.push(job)
              }

              if (!prisma) continue

              if (existingKeys.has(key)) {
                if (existingAppliedKeys.has(key)) {
                  console.log(`[Scraper] Pula "${job.title}" em ${job.company} — vaga já candidatada.`)
                }
                skippedCount++
                continue
              }

              if (existingUrls.has(urlKey)) {
                skippedCount++
                continue
              }

              try {
                const created = await prisma.job.create({
                  data: { ...job, status: 'discovered' },
                })
                existingKeys.add(key)
                existingUrls.add(urlKey)
                savedCount++
                savedJobs.push({
                  id: created.id,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  description: job.description,
                })
              } catch {
                skippedCount++
              }
            }

            if (prisma && logEntry) {
              await prisma.scrapeLog.update({
                where: { id: logEntry.id },
                data: { resultsCount: results.length, success: true },
              })
            }
          } catch (error) {
            console.error(`[Scraper] Erro em ${platform} para "${query}":`, error)
            if (prisma && logEntry) {
              await prisma.scrapeLog.update({
                where: { id: logEntry.id },
                data: { success: false, errorMessage: String(error) },
              })
            }
          }
        }
      }

      await page.close().catch(() => {})
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  // LLM-based relevance filter: remove jobs that don't match the configured locations
  if (prisma && savedJobs.length > 0) {
    const llm = await readLLMConfig(prisma)
    if (llm) {
      console.log(`[Scraper] LLM filtrando ${savedJobs.length} vagas contra localizações ${JSON.stringify(locations)}...`)
      const { keep, remove } = await filterJobsByRelevance(savedJobs, locations, llm)

      if (remove.length > 0) {
        await prisma.job.deleteMany({ where: { id: { in: remove } } })
        removedByLLM = remove.length
        console.log(`[Scraper] LLM removeu ${removedByLLM} vagas irrelevantes.`)
      }
    } else {
      console.log('[Scraper] Nenhum LLM configurado — todas as vagas salvas são mantidas.')
    }
  }

  if (prisma) {
    console.log(
      `[Scraper] Resumo: ${savedCount} salvas, ${skippedCount} duplicadas/já candidatadas, ${removedByLLM} removidas pelo LLM.`
    )
  }

  return allResults
}