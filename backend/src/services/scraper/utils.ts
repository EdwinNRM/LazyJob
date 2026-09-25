import type { Page } from 'playwright'

export function normalizeText(text: string = ''): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesExpectedLocation(
  jobLocation: string | undefined,
  expectedLocations: string[]
): boolean {
  if (!jobLocation) return false
  const loc = normalizeText(jobLocation)
  if (!loc) return false

  return expectedLocations.some((expected) => {
    const en = normalizeText(expected)
    if (!en) return false

    if (en.includes('remoto')) {
      return loc.includes('remoto')
    }

    return loc.includes(en) || en.includes(loc)
  })
}

export async function isCloudflareChallenge(page: Page): Promise<boolean> {
  try {
    const url = page.url()
    const title = await page.title()
    const hasChallengeEl =
      (await page.locator('#challenge-form, #challenge-running, .cf-challenge-running, #turnstile-wrapper').count()) > 0

    return (
      url.includes('__cf_chl_rt_tk') ||
      title.toLowerCase().includes('just a moment') ||
      title.toLowerCase().includes('verifique') ||
      hasChallengeEl
    )
  } catch {
    return false
  }
}

export async function isSpamOrAuthWall(page: Page): Promise<boolean> {
  try {
    const title = await page.title()
    const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase()

    return (
      title.toLowerCase().includes('spam') ||
      body.includes('pedimos desculpas') ||
      body.includes('unusual traffic') ||
      body.includes('tráfego incomum') ||
      body.includes('verify you are human') ||
      body.includes('prove você é humano') ||
      body.includes('captcha') ||
      (body.includes('fazer login') && body.includes('para continuar'))
    )
  } catch {
    return false
  }
}

export async function waitForChallengeClear(page: Page, timeoutMs = 20000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const [challenge, spam] = await Promise.all([
      isCloudflareChallenge(page),
      isSpamOrAuthWall(page),
    ])
    if (!challenge && !spam) return true
    await page.waitForTimeout(1500)
  }
  return false
}

export function dedupKey(job: { title: string; company: string; platform?: string; url?: string; description?: string | null }): string {
  const descriptionFingerprint = normalizeText(job.description || '').slice(0, 200)
  return `${normalizeText(job.title)}|${normalizeText(job.company)}|${descriptionFingerprint}`
}
