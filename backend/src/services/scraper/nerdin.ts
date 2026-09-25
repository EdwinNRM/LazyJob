import type { Page } from 'playwright'

export async function scrapeNerdin(page: Page, query: string): Promise<any[]> {
  const url = `https://www.nerdin.com.br/vagas?busca=${encodeURIComponent(query)}&modelo=home-office`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2500)
  return page.locator('a[href*="vaga_emprego/"]').evaluateAll((anchors: any[]) => anchors.slice(0, 40).map((a: any) => {
    const card = a.closest('.vaga-card')
    const text = (card?.innerText || '').trim()
    const lines = text.split('\n').map((line: string) => line.trim()).filter(Boolean)
    const salaryIndex = lines.findIndex((line: string) => /sal[aá]rio|r\$|a combinar/i.test(line))
    return {
      title: (lines[0] || '').replace(/\s+Nova$/i, '').trim(),
      company: salaryIndex >= 0 ? lines[salaryIndex + 1] || 'Não informada' : 'Não informada',
      platform: 'nerdin',
      url: a.href,
      description: text,
      location: /home office/i.test(text) ? 'Home Office - Brasil' : lines.find((line: string) => /remoto|híbrido|presencial|\s[•-]\s[A-Z]{2}$/i.test(line)),
    }
  }).filter((job: any) => job.title && job.url))
}
