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

export async function scrapeGlassdoor(query: string, location: string): Promise<ScrapedJob[]> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const searchUrl = `https://www.glassdoor.com.br/Vaga/index.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locId=&jobType=`
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })

    await page.waitForSelector('[data-test="jobListing"]', { timeout: 10000 }).catch(() => {})

    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-test="jobListing"]')
      return Array.from(cards).slice(0, 15).map((card: any) => {
        const titleEl = card.querySelector('[data-test="job-title"]')
        const companyEl = card.querySelector('[data-test="employer-name"]')
        const locationEl = card.querySelector('[data-test="job-location"]')
        const salaryEl = card.querySelector('[data-test="job-salary"]')
        const linkEl = card.querySelector('a')

        return {
          title: titleEl?.innerText?.trim() || '',
          company: companyEl?.innerText?.trim() || '',
          platform: 'glassdoor',
          url: linkEl?.href || '',
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
