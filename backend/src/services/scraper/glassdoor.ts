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

export async function scrapeGlassdoor(page: Page, query: string, _location: string): Promise<ScrapedJob[]> {
  const searchUrl = `https://www.glassdoor.com.br/Vaga/index.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locId=&jobType=`

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(3000)

  if (await isCloudflareChallenge(page)) {
    const cleared = await waitForChallengeClear(page)
    if (!cleared) {
      console.log('[Glassdoor] Bloqueado por Cloudflare. Retornando 0 vagas.')
      return []
    }
  }

  if (await isSpamOrAuthWall(page)) {
    console.log('[Glassdoor] Página de autenticação/anti-spam detectada. Retornando 0 vagas.')
    return []
  }

  const jobs = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/partner/joblisting"], a[href*="jobListing"]')).slice(0, 15)
    return anchors.map((a: any) => {
      const card = a.closest('[data-test]') || a.closest('li') || a.closest('div')
      const text = (card?.innerText || a.innerText || '').split('\n').map((l: string) => l.trim()).filter(Boolean)
      return {
        title: text[0] || '',
        company: text[1] || '',
        platform: 'glassdoor',
        url: a.href || '',
        description: '',
        location: text.find((l: string) => l.includes('–') || l.includes('-') || l.includes(',')) || undefined,
      }
    }).filter((j: any) => j.title && j.url)
  })

  return jobs
}
