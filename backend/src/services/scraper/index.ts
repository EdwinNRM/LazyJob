import { PrismaClient } from '@prisma/client'
import { scrapeLinkedIn } from './linkedin'
import { scrapeIndeed } from './indeed'
import { scrapeGupy } from './gupy'
import { scrapeGlassdoor } from './glassdoor'

interface ScrapeOptions {
  queries: string[]
  locations?: string[]
  platforms?: ('linkedin' | 'indeed' | 'gupy' | 'glassdoor')[]
  prisma?: PrismaClient
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
  const { queries, locations = [], platforms, prisma } = options

  if (queries.length === 0) return []

  const enabledPlatforms = platforms ?? ['linkedin', 'indeed', 'gupy', 'glassdoor']
  const allResults: ScrapedJob[] = []

  const scrapers: Record<string, (q: string, loc: string) => Promise<ScrapedJob[]>> = {
    linkedin: scrapeLinkedIn,
    indeed: scrapeIndeed,
    gupy: scrapeGupy,
    glassdoor: scrapeGlassdoor,
  }

  for (const platform of enabledPlatforms) {
    const scraper = scrapers[platform]
    if (!scraper) continue

    for (const query of queries) {
      for (const location of locations) {
        const logEntry = prisma ? await prisma.scrapeLog.create({
          data: { platform, query, resultsCount: 0, success: false },
        }) : null

        try {
          console.log(`[Scraper] ${platform}: buscando "${query}" em "${location}"`)
          const results = await scraper(query, location)
          allResults.push(...results)

          if (prisma && logEntry) {
            await prisma.scrapeLog.update({
              where: { id: logEntry.id },
              data: { resultsCount: results.length, success: true },
            })
          }

          if (prisma) {
            for (const job of results) {
              try {
                await prisma.job.upsert({
                  where: { url: job.url },
                  update: { title: job.title, company: job.company, description: job.description, salary: job.salary, location: job.location },
                  create: { ...job, status: 'discovered' },
                })
              } catch (e) {
                // Ignorar duplicatas
              }
            }
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
  }

  return allResults
}
