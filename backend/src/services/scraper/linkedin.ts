import type { Page } from 'playwright'
import { isCloudflareChallenge, isSpamOrAuthWall, waitForChallengeClear, normalizeText } from './utils'

declare const document: any

interface ScrapedJob {
  title: string
  company: string
  platform: string
  url: string
  description: string
  salary?: string
  location?: string
}

export async function scrapeLinkedIn(page: Page, query: string, location: string): Promise<ScrapedJob[]> {
  const isRemote = normalizeText(location).includes('remoto')
  const searchUrl = isRemote
    ? `https://www.linkedin.com/jobs/search/?f_WT=2&geoId=106057199&keywords=${encodeURIComponent(query)}&origin=JOB_SEARCH_PAGE_LOCATION_SUGGESTION`
    : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(3000)

  if (await isCloudflareChallenge(page)) {
    const cleared = await waitForChallengeClear(page)
    if (!cleared) {
      console.log('[LinkedIn] Bloqueado por Cloudflare. Retornando 0 vagas.')
      return []
    }
  }

  if (await isSpamOrAuthWall(page)) {
    console.log('[LinkedIn] Página de login/verificação. Retornando 0 vagas (logado? configure credenciais).')
    return []
  }

  await page.waitForSelector('.job-card-container', { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const jobs = await page.evaluate(() => {
    const cards = document.querySelectorAll('.job-card-container')
    return Array.from(cards).slice(0, 15).map((card: any) => {
      const titleEl = card.querySelector('.job-card-list__title')
      const companyEl = card.querySelector('.job-card-container__company-name')
      const locationEl = card.querySelector('.job-card-container__metadata-item')
      const linkEl = card.querySelector('a')

      return {
        title: titleEl?.innerText?.trim() || '',
        company: companyEl?.innerText?.trim() || '',
        platform: 'linkedin',
        url: linkEl?.href || '',
        description: '',
        location: locationEl?.innerText?.trim() || undefined,
      }
    }).filter((j: any) => j.title && j.url)
  })

  return jobs
}
