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

export async function scrapeIndeed(query: string, location: string): Promise<ScrapedJob[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const searchUrl = `https://br.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })

    await page.waitForSelector('.job_seen_beacon', { timeout: 10000 }).catch(() => {})

    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('.job_seen_beacon')
      return Array.from(cards).slice(0, 15).map((card: any) => {
        const titleEl = card.querySelector('h2.jobTitle a')
        const companyEl = card.querySelector('[data-testid="company-name"]')
        const locationEl = card.querySelector('[data-testid="text-location"]')
        const salaryEl = card.querySelector('[data-testid="attribute_snippet_testid"]')
        const linkEl = card.querySelector('h2.jobTitle a')

        return {
          title: titleEl?.innerText?.trim() || '',
          company: companyEl?.innerText?.trim() || '',
          platform: 'indeed',
          url: linkEl?.href ? `https://br.indeed.com${linkEl.getAttribute('href') || ''}` : '',
          description: '',
          salary: salaryEl?.innerText?.trim() || undefined,
          location: locationEl?.innerText?.trim() || undefined,
        }
      }).filter((j: any) => j.title && j.url)
    })

    return jobs
  } finally {
    await browser.close()
  }
}
