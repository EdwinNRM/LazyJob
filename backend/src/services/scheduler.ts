import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { scrapeAllPlatforms } from './scraper'

export const DEFAULT_QUERIES = [
  'analista de desenvolvimento de sistemas pleno',
  'analista de sistemas pleno',
  'analista desenvolvedor pleno',
]

export const DEFAULT_LOCATIONS = [
  'Remoto',
  'São José do Rio Preto',
]

async function runScrape(prisma: PrismaClient) {
  console.log('[Scheduler] Iniciando scrape...')

  const queriesSetting = await prisma.setting.findUnique({
    where: { key: 'searchQueries' },
  })

  const locationsSetting = await prisma.setting.findUnique({
    where: { key: 'searchLocations' },
  })

  const queries = queriesSetting
    ? JSON.parse(queriesSetting.value)
    : DEFAULT_QUERIES

  const locations = locationsSetting
    ? JSON.parse(locationsSetting.value)
    : DEFAULT_LOCATIONS

  const results = await scrapeAllPlatforms({
    queries,
    locations,
    prisma,
  })
  console.log(`[Scheduler] Scrape concluído: ${results.length} novas vagas encontradas`)
  return results
}

export function startScheduler(prisma: PrismaClient) {
  cron.schedule('0 6 * * *', async () => {
    console.log('[Scheduler] Scrape matinal agendado (06:00)')
    await runScrape(prisma)
  })

  cron.schedule('0 18 * * *', async () => {
    console.log('[Scheduler] Scrape vespertino agendado (18:00)')
    await runScrape(prisma)
  })

  console.log('[Scheduler] Agendador iniciado (06:00 e 18:00)')
}
