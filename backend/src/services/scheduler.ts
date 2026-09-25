import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { beginScrape } from './scrape-run'
export const DEFAULT_QUERIES = ['desenvolvedor de software', 'analista de sistemas']
export const DEFAULT_LOCATIONS = ['Remoto Brasil']
export function startScheduler(prisma: PrismaClient) {
 const task = cron.schedule('0 6,18 * * *', async () => {
  try { await beginScrape(prisma, {}) }
  catch (error) { console.error('[Scheduler]', error instanceof Error ? error.message : error) }
 }, { timezone: 'America/Sao_Paulo' })
 console.log('[Scheduler] Coleta às 06h e 18h (America/Sao_Paulo)')
 return [task]
}
