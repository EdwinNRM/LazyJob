import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseCV, optimizeCV, generateCV } from './index'

describe('CV Engine Service', () => {
  describe('parseCV', () => {
    it('should throw on invalid PDF buffer', async () => {
      const mockBuffer = Buffer.from('not a real pdf')
      await expect(parseCV(mockBuffer)).rejects.toThrow()
    })

    it('should throw on empty buffer', async () => {
      await expect(parseCV(Buffer.alloc(0))).rejects.toThrow()
    })
  })

  describe('optimizeCV', () => {
    it('should return optimized CV text', async () => {
      const cvText = 'EXPERIÊNCIA\n5 anos como desenvolvedor React\nHABILIDADES\nReact, TypeScript, Node.js\nRESUMO\nDesenvolvedor full stack'
      const jobDescription = 'Vaga para desenvolvedor React sênior com TypeScript'

      const result = await optimizeCV(cvText, jobDescription)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should work with plain text and no sections', async () => {
      const cvText = 'Desenvolvedor com experiência em React e TypeScript'
      const jobDescription = 'Precisamos de React e TypeScript'

      const result = await optimizeCV(cvText, jobDescription)

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })

  describe('generateCV', () => {
    it('should generate a PDF buffer from text', async () => {
      const text = 'Currículo Otimizado - John Doe'
      const result = await generateCV(text, '/tmp/test-output.pdf')
      expect(result).toBeDefined()
    })
  })
})
