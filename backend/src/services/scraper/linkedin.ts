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

export async function scrapeLinkedIn(query: string, location: string): Promise<ScrapedJob[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })

    await page.waitForSelector('.job-card-container', { timeout: 10000 }).catch(() => {})

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
  } finally {
    await browser.close()
  }
}
