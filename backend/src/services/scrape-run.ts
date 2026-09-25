import type { PrismaClient } from '@prisma/client'
import { scrapeRequestSchema } from '../lib/validation'
import { scrapeAllPlatforms } from './scraper'
let running = false
export async function beginScrape(prisma: PrismaClient, body: Record<string, unknown>) {
 if (running) { const error = new Error('Já existe uma coleta em andamento'); Object.assign(error, { status: 409 }); throw error }
 running = true
 try {
  const settings = Object.fromEntries((await prisma.setting.findMany()).map(s => [s.key, s.value]))
  const options = scrapeRequestSchema.parse({
   queries: settings.searchQueries ? JSON.parse(settings.searchQueries) : ['desenvolvedor de software'],
   locations: settings.searchLocations ? JSON.parse(settings.searchLocations) : ['Remoto Brasil'],
   platforms: settings.enabledSources ? JSON.parse(settings.enabledSources) : ['nerdin'],
   ...body,
  })
  const run = await prisma.scrapeRun.create({ data: { status: 'running', sources: JSON.stringify(options.platforms), startedAt: new Date() } })
  void (async () => {
   const failures: string[] = []; let successful = 0
   try {
    const results = await scrapeAllPlatforms({ ...options, prisma, onSourceResult: (source, error) => { if (error) failures.push(source + ': ' + error); else successful++ } })
    await prisma.scrapeRun.update({ where: { id: run.id }, data: {
     status: failures.length ? successful ? 'partial' : 'failed' : 'completed',
     resultsCount: results.length, errorMessage: failures.length ? failures.join('\n') : null, finishedAt: new Date(),
    } })
   } catch (error) {
    await prisma.scrapeRun.update({ where: { id: run.id }, data: { status: 'failed', errorMessage: String(error), finishedAt: new Date() } })
   } finally { running = false }
  })().catch(error => { running = false; console.error('[Coleta]', error.message) })
  return run
 } catch (error) { running = false; throw error }
}
