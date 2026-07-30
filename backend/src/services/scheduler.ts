import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { scrapeAllPlatforms } from './scraper'

export function startScheduler(prisma: PrismaClient) {
  const defaultQueries = ['developer', 'software engineer', 'frontend', 'backend', 'full stack']
  const defaultLocations = ['Brasil', 'Remoto']

  cron.schedule('0 6 * * *', async () => {
    console.log('[Scheduler] Iniciando scrape matinal...')

    const queriesSetting = await prisma.setting.findUnique({
      where: { key: 'searchQueries' },
    })

    const locationsSetting = await prisma.setting.findUnique({
      where: { key: 'searchLocations' },
    })

    const queries = queriesSetting
      ? JSON.parse(queriesSetting.value)
      : defaultQueries

    const locations = locationsSetting
      ? JSON.parse(locationsSetting.value)
      : defaultLocations

    const autoApplySetting = await prisma.setting.findUnique({
      where: { key: 'autoApplyEnabled' },
    })

    const results = await scrapeAllPlatforms({
      queries,
      locations,
      prisma,
    })

    console.log(`[Scheduler] Scrape concluído: ${results.length} novas vagas encontradas`)
  })

  cron.schedule('0 18 * * *', async () => {
    console.log('[Scheduler] Iniciando scrape vespertino...')
    // Mesma lógica do matinal
  })

  console.log('[Scheduler] Agendador iniciado (06:00 e 18:00)')
}
