import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrapeLinkedIn } from './linkedin'

function makePage(url = 'https://www.linkedin.com') {
  return {
    url: vi.fn().mockReturnValue(url),
    title: vi.fn().mockResolvedValue(''),
    locator: vi.fn().mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
      innerText: vi.fn().mockResolvedValue(''),
    }),
    goto: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue([]),
  }
}

describe('scrapeLinkedIn', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses f_WT=2 + geoId=Brasil quando localização é remota', async () => {
    const page = makePage()
    await scrapeLinkedIn(page as any, 'Analista de desenvolvimento de sistemas', 'Remoto')
    const url = (page.goto as any).mock.calls[0][0]
    expect(url).toContain('f_WT=2')
    expect(url).toContain('geoId=106057199')
    expect(url).toContain('origin=JOB_SEARCH_PAGE_LOCATION_SUGGESTION')
    expect(url).toContain(encodeURIComponent('Analista de desenvolvimento de sistemas'))
    expect(url).not.toContain('location=')
  })

  it('usa location= para cidade (São José do Rio Preto)', async () => {
    const page = makePage()
    await scrapeLinkedIn(page as any, 'analista de sistemas pleno', 'São José do Rio Preto')
    const url = (page.goto as any).mock.calls[0][0]
    expect(url).toContain('location=S%C3%A3o%20Jos%C3%A9%20do%20Rio%20Preto')
    expect(url).not.toContain('f_WT=2')
  })
})
