import { chromium } from 'playwright'
import { Job } from '@prisma/client'

export async function applyGupy(job: Job, cvPath: string): Promise<boolean> {
  console.log(`[Gupy Apply] Candidatando-se a: ${job.title}`)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(job.url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    const applyButton = page.locator('button:has-text("Candidatar-se"), button:has-text("Inscreva-se"), a:has-text("Candidatar-se")')
    const isVisible = await applyButton.first().isVisible().catch(() => false)

    if (!isVisible) {
      console.log(`[Gupy Apply] Botão de candidatura não encontrado`)
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

    const submitButton = page.locator('button:has-text("Enviar"), button:has-text("Concluir"), button:has-text("Finalizar")')
    if (await submitButton.first().isVisible().catch(() => false)) {
      await submitButton.first().click()
      await page.waitForTimeout(3000)
      await browser.close()
      return true
    }

    const pageContent = await page.textContent('body')
    if (pageContent?.includes('obrigado') || pageContent?.includes('recebemos')) {
      await browser.close()
      return true
    }

    await browser.close()
    return false
  } catch (error) {
    console.error(`[Gupy Apply] Erro:`, error)
    await browser.close()
    return false
  }
}
