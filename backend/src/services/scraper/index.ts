import { chromium, Page } from 'playwright'
import type { PrismaClient } from '@prisma/client'
import { scrapeLinkedIn } from './linkedin'
import { scrapeIndeed } from './indeed'
import { scrapeGupy } from './gupy'
import { scrapeGlassdoor } from './glassdoor'
import { scrapeNerdin } from './nerdin'
import { scrapeRss, scrapeJsonApis } from './feeds'
import { dedupKey } from './utils'
import { canonicalizeUrl, classifyJob } from '../classification'
import { createJobSchema } from '../../lib/validation'
interface ScrapeOptions {
 queries: string[]; locations?: string[]
 platforms?: ('linkedin'|'indeed'|'gupy'|'glassdoor'|'nerdin'|'rss'|'api')[]
 prisma?: PrismaClient; headless?: boolean
 onSourceResult?: (source: string, error?: string) => void
}
interface ScrapedJob { title: string; company: string; platform: string; url: string; description: string; salary?: string; location?: string; publishedAt?: string }
export async function scrapeAllPlatforms(options: ScrapeOptions): Promise<ScrapedJob[]> {
 const { queries, prisma } = options
 if (!queries.length) return []
 const platforms = options.platforms ?? ['linkedin','indeed','gupy','glassdoor','nerdin','rss','api']
 const locations = options.locations?.length ? options.locations : ['Remoto Brasil']
 const results: ScrapedJob[] = []
 const existing = prisma ? await prisma.job.findMany({ select: { title: true, company: true, platform: true, url: true, description: true } }) : []
 const keys = new Set(existing.map(dedupKey)), urls = new Set(existing.map(j => canonicalizeUrl(j.url)))
 async function save(jobs: ScrapedJob[]) {
  let count = 0
  for (const raw of jobs) {
   const checked = createJobSchema.safeParse(raw)
   if (!checked.success) continue
   const job = { ...checked.data, url: canonicalizeUrl(raw.url) }
   const key = dedupKey(job)
   if (keys.has(key) || urls.has(job.url)) continue
   const result = classifyJob(job)
   if (prisma) {
    try {
     await prisma.job.create({ data: { ...job, canonicalUrl: job.url, status: 'discovered',
      workMode: result.workMode, brazilEligible: result.brazilEligible, isTech: result.isTech,
      classificationStatus: result.accepted ? 'accepted' : result.confidence < 0.7 ? 'pending' : 'excluded',
      classificationConfidence: result.confidence, classificationReason: result.reason,
      seniority: result.seniority, technologies: JSON.stringify(result.technologies),
      publishedAt: raw.publishedAt && !Number.isNaN(Date.parse(raw.publishedAt)) ? new Date(raw.publishedAt) : undefined,
     } })
    } catch (error) { if ((error as {code?:string}).code === 'P2002') continue; throw error }
   }
   keys.add(key); urls.add(job.url); results.push(raw); count++
  }
  return count
 }
 async function collect(platform: string, query: string, fn: () => Promise<ScrapedJob[]>) {
  try {
   const count = await save(await fn())
   if (prisma) await prisma.scrapeLog.create({ data: { platform, query, resultsCount: count, success: true } })
   options.onSourceResult?.(platform)
  } catch (error) {
   const message = error instanceof Error ? error.message : String(error)
   if (prisma) await prisma.scrapeLog.create({ data: { platform, query, success: false, errorMessage: message } })
   options.onSourceResult?.(platform, message)
  }
 }
 // Each feed is independent; browser installation/blocking cannot prevent feed imports.
 for (const platform of platforms.filter(p => p === 'rss' || p === 'api')) {
  const setting = prisma ? await prisma.setting.findUnique({ where: { key: platform === 'rss' ? 'rssUrls' : 'publicApiUrls' } }) : null
  let addresses: string[] = []
  try { addresses = JSON.parse(setting?.value || '[]'); if (!Array.isArray(addresses)) throw new Error() }
  catch { await collect(platform, 'configuração', async () => { throw new Error('Lista de URLs inválida') }); continue }
  if (!addresses.length) { await collect(platform, 'configuração', async () => { throw new Error('Nenhuma URL configurada para esta fonte') }); continue }
  for (const address of addresses) await collect(platform, address, () => platform === 'rss' ? scrapeRss([address]) : scrapeJsonApis([address]))
 }
 const scrapers: Record<string, (page: Page, q: string, loc: string) => Promise<ScrapedJob[]>> = {
  linkedin: scrapeLinkedIn, indeed: scrapeIndeed, gupy: scrapeGupy, glassdoor: scrapeGlassdoor, nerdin: scrapeNerdin,
 }
 for (const platform of platforms.filter(p => p !== 'rss' && p !== 'api')) {
  for (const query of queries) for (const location of locations) {
   await collect(platform, query, async () => {
    const browser = await chromium.launch({ headless: options.headless ?? true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
    try {
     const context = await browser.newContext({ locale: 'pt-BR', viewport: { width: 1366, height: 768 } })
     const page = await context.newPage()
     let responseStatus = 200
     page.on('response', response => { if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) responseStatus = response.status() })
     page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000)
     const found = await scrapers[platform](page, query, location)
     if (responseStatus >= 400) throw new Error('Fonte indisponível ou bloqueada: HTTP ' + responseStatus + '. Consulte o site manualmente.')
     if (!found.length) {
      const body = await page.locator('body').innerText()
      if (/captcha|access denied|verify you are human|verifique.*humano|sign in|faça login|just a moment|security check|solicita[cç][aã]o bloqueada|somente humanos|o sistema bloqueou/i.test(body) || /authwall|login|checkpoint/.test(page.url())) throw new Error('Fonte bloqueou o acesso ou exige login. Abra o site e adicione a vaga manualmente.')
      // Empty pages and changed markup are indistinguishable from no results.
      throw new Error('Nenhuma vaga legível: a busca pode estar vazia ou o site mudou. Confira a fonte manualmente.')
     }
     return found
    } finally { await browser.close() }
   })
  }
 }
 return results
}
