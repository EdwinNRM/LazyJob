import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrapeAllPlatforms } from './index'
import { matchesExpectedLocation, dedupKey } from './utils'

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          waitForSelector: vi.fn().mockResolvedValue(undefined),
          waitForTimeout: vi.fn().mockResolvedValue(undefined),
          evaluate: vi.fn().mockResolvedValue([]),
          locator: vi.fn().mockReturnValue({ evaluateAll: vi.fn().mockResolvedValue([]) }),
          close: vi.fn().mockResolvedValue(undefined),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

describe('Scraper Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scrapeAllPlatforms', () => {
    it('should return results for each platform', async () => {
      const queries = ['developer react']
      const locations = ['São Paulo']

      const results = await scrapeAllPlatforms({ queries, locations })

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle empty queries gracefully', async () => {
      const results = await scrapeAllPlatforms({ queries: [], locations: [] })
      expect(results).toEqual([])
    })
  })

  describe('matchesExpectedLocation', () => {
    it('should match remote jobs when "Remoto" is expected', () => {
      expect(matchesExpectedLocation('Remoto', ['Remoto'])).toBe(true)
      expect(matchesExpectedLocation('Remoto - Brasil', ['Remoto'])).toBe(true)
      expect(matchesExpectedLocation('São Paulo - SP', ['Remoto'])).toBe(false)
    })

    it('should match city jobs for São José do Rio Preto', () => {
      const expected = ['Remoto', 'São José do Rio Preto']
      expect(matchesExpectedLocation('São José do Rio Preto - SP', expected)).toBe(true)
      expect(matchesExpectedLocation('São Paulo - SP', expected)).toBe(false)
      expect(matchesExpectedLocation(undefined, expected)).toBe(false)
    })

    it('should be case and accent insensitive', () => {
      expect(matchesExpectedLocation('são josé do rio preto - sp', ['SÃO JOSÉ DO RIO PRETO'])).toBe(true)
      expect(matchesExpectedLocation('REMOTO', ['remoto'])).toBe(true)
    })
  })

  describe('dedupKey', () => {
    it('should normalize case, accents and spaces', () => {
      const a = dedupKey({ title: 'Analista de Sistemas', company: 'Vetta Tecnologia', platform: 'GUPY' })
      const b = dedupKey({ title: 'Analista de Sistemas', company: 'vetta tecnologia', platform: 'gupy' })
      expect(a).toBe(b)
    })

    it('should differ for distinct jobs', () => {
      const a = dedupKey({ title: 'Analista de Sistemas', company: 'Vetta', platform: 'gupy' })
      const b = dedupKey({ title: 'Analista de Sistemas', company: 'Itaú', platform: 'gupy' })
      expect(a).not.toBe(b)
    })
  })
})
