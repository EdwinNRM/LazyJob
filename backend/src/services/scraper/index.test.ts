import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrapeAllPlatforms } from './index'

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          evaluate: vi.fn().mockResolvedValue([]),
          close: vi.fn(),
        }),
        close: vi.fn(),
      }),
      close: vi.fn(),
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
})
