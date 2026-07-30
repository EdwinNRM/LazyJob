import { chromium } from 'playwright'
import { Job } from '@prisma/client'

export async function applyLinkedIn(job: Job, cvPath: string): Promise<boolean> {
  console.log(`[LinkedIn Apply] Candidatando-se a: ${job.title}`)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    storageState: 'linkedin-auth.json',
  }).catch(() => undefined)

  const page = await (context || await browser.newContext()).newPage()

  try {
    await page.goto(job.url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    const easyApplyButton = page.locator('button:has-text("Easy Apply"), button:has-text("Candidatura simplificada"), button:has-text("Candidatar-se")')
    const isVisible = await easyApplyButton.first().isVisible().catch(() => false)

    if (!isVisible) {
      console.log(`[LinkedIn Apply] Botão Easy Apply não encontrado para ${job.title}`)
      await browser.close()
      return false
    }

    await easyApplyButton.first().click()
    await page.waitForTimeout(2000)

    let formSubmitted = false
    for (let i = 0; i < 5; i++) {
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Próximo"), button:has-text("Avançar")')
      const submitButton = page.locator('button:has-text("Submit"), button:has-text("Enviar"), button:has-text("Concluir")')
      const reviewButton = page.locator('button:has-text("Review"), button:has-text("Revisar")')

      if (await submitButton.first().isVisible().catch(() => false)) {
        await submitButton.first().click()
        formSubmitted = true
        break
      }

      if (await reviewButton.first().isVisible().catch(() => false)) {
        await reviewButton.first().click()
        await page.waitForTimeout(1000)
        continue
      }

      if (await nextButton.first().isVisible().catch(() => false)) {
        await nextButton.first().click()
        await page.waitForTimeout(1500)
        continue
      }

      await page.waitForTimeout(1000)
    }

    if (!formSubmitted) {
      const finalSubmit = page.locator('button:has-text("Submit"), button:has-text("Enviar")')
      if (await finalSubmit.first().isVisible().catch(() => false)) {
        await finalSubmit.first().click()
        formSubmitted = true
      }
    }

    await page.waitForTimeout(2000)
    await browser.close()
    return formSubmitted
  } catch (error) {
    console.error(`[LinkedIn Apply] Erro:`, error)
    await browser.close()
    return false
  }
}
