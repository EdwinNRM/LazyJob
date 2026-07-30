import { chromium } from 'playwright'

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

export async function scrapeGupy(query: string, _location: string): Promise<ScrapedJob[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const searchUrl = `https://portal.gupy.io/job-search?term=${encodeURIComponent(query)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })

    await page.waitForSelector('[data-testid="job-list-item"]', { timeout: 10000 }).catch(() => {})

    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="job-list-item"]')
      return Array.from(cards).slice(0, 15).map((card: any) => {
        const titleEl = card.querySelector('[data-testid="job-list-item-title"]')
        const companyEl = card.querySelector('[data-testid="job-list-item-headline"]')
        const locationEl = card.querySelector('[data-testid="job-list-item-location"]')
        const linkEl = card.querySelector('a')

        return {
          title: titleEl?.innerText?.trim() || '',
          company: companyEl?.innerText?.trim() || '',
          platform: 'gupy',
          url: linkEl?.href || '',
          description: '',
          location: locationEl?.innerText?.trim() || undefined,
        }
      }).filter((j: any) => j.title && j.url)
    })

    return jobs
  } finally {
    await browser.close()
  }
}
