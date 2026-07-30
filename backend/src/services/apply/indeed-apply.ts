import { chromium } from 'playwright'
import { Job } from '@prisma/client'

export async function applyIndeed(job: Job, cvPath: string): Promise<boolean> {
  console.log(`[Indeed Apply] Candidatando-se a: ${job.title}`)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(job.url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    const applyButton = page.locator('button:has-text("Apply Now"), button:has-text("Candidatar-se"), button:has-text("Candidate-se")')
    const isVisible = await applyButton.first().isVisible().catch(() => false)

    if (!isVisible) {
      console.log(`[Indeed Apply] Botão de candidatura não encontrado`)
      await browser.close()
      return false
    }

    await applyButton.first().click()
    await page.waitForTimeout(2000)

    const fileInput = page.locator('input[type="file"]').first()
    if (await fileInput.isVisible().catch(() => false)) {
      await fileInput.setInputFiles(cvPath)
      await page.waitForTimeout(2000)
    }

    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Enviar"), button:has-text("Apply")')
    if (await submitButton.first().isVisible().catch(() => false)) {
      await submitButton.first().click()
      await page.waitForTimeout(2000)
      await browser.close()
      return true
    }

    await browser.close()
    return false
  } catch (error) {
    console.error(`[Indeed Apply] Erro:`, error)
    await browser.close()
    return false
  }
}
