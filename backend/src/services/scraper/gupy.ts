import type { Page } from 'playwright'

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

export async function scrapeGupy(page: Page, query: string, _location: string): Promise<ScrapedJob[]> {
  const searchUrl = `https://portal.gupy.io/job-search/term=${encodeURIComponent(query).replace(/%20/g, '+')}`

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(4000)
  await page.waitForSelector('a[href*="/job/"]', { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const jobs = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/job/"]')).slice(0, 15)
    return anchors.map((a: any) => {
      const lines = (a.innerText || '')
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
      return {
        title: lines[1] || '',
        company: lines[0] || '',
        platform: 'gupy',
        url: a.href || '',
        description: '',
        location: lines[2] || undefined,
      }
    }).filter((j: any) => j.title && j.url)
  })

  return jobs
}
