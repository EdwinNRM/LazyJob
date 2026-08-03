import type { Page } from 'playwright'
import { isCloudflareChallenge, isSpamOrAuthWall, waitForChallengeClear } from './utils'

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

export async function scrapeIndeed(page: Page, query: string, location: string): Promise<ScrapedJob[]> {
  const searchUrl = `https://br.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(3000)

  if (await isCloudflareChallenge(page)) {
    const cleared = await waitForChallengeClear(page)
    if (!cleared) {
      console.log('[Indeed] Bloqueado por Cloudflare. Retornando 0 vagas.')
      return []
    }
  }

  if (await isSpamOrAuthWall(page)) {
    console.log('[Indeed] Página de autenticação/anti-spam detectada. Retornando 0 vagas.')
    return []
  }

  await page.waitForSelector('.job_seen_beacon', { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(2000)

    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('.job_seen_beacon')
      return Array.from(cards).slice(0, 15).map((card: any) => {
        const linkEl = card.querySelector('a.jcs-JobTitle') || card.querySelector('h2.jobTitle a, h3.jobTitle a')
        const companyEl = card.querySelector('[data-testid="company-name"]') || card.querySelector('.companyName')
        const locationEl = card.querySelector('[data-testid="text-location"]') || card.querySelector('.companyLocation')
        const salaryEl = card.querySelector('[data-testid="attribute_snippet_testid"]') || card.querySelector('.salary-snippet')

        const href = linkEl?.getAttribute('href') || ''
        return {
          title: linkEl?.innerText?.trim() || '',
          company: companyEl?.innerText?.trim() || '',
          platform: 'indeed',
          url: href ? `https://br.indeed.com${href.startsWith('/') ? href : `/${href}`}` : '',
          description: '',
          salary: salaryEl?.innerText?.trim() || undefined,
          location: locationEl?.innerText?.trim() || undefined,
        }
      }).filter((j: any) => j.title && j.url)
    })

  return jobs
}
