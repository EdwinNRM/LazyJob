import { chromium } from 'playwright'
import { Job } from '@prisma/client'

export async function applyGlassdoor(job: Job, cvPath: string): Promise<boolean> {
  console.log(`[Glassdoor Apply] Candidatando-se a: ${job.title}`)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(job.url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    const applyButton = page.locator('button:has-text("Apply"), button:has-text("Candidatar-se"), a:has-text("Apply")')
    const isVisible = await applyButton.first().isVisible().catch(() => false)

    if (!isVisible) {
      console.log(`[Glassdoor Apply] Botão de candidatura não encontrado`)
      await browser.close()
      return false
    }

    await applyButton.first().click()
    await page.waitForTimeout(3000)

    const fileInput = page.locator('input[type="file"]').first()
    if (await fileInput.isVisible().catch(() => false)) {
      await fileInput.setInputFiles(cvPath)
      await page.waitForTimeout(2000)
    }

    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send"), button:has-text("Enviar")')
    if (await submitButton.first().isVisible().catch(() => false)) {
      await submitButton.first().click()
      await page.waitForTimeout(2000)
      await browser.close()
      return true
    }

    await browser.close()
    return false
  } catch (error) {
    console.error(`[Glassdoor Apply] Erro:`, error)
    await browser.close()
    return false
  }
}
