import { describe, it, expect, vi, beforeEach } from 'vitest'
import os from 'os'
import path from 'path'
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

    it('should use LLM output when provided and fall back on failure', async () => {
      const cvText = 'EXPERIÊNCIA\n5 anos como desenvolvedor React\nHABILIDADES\nReact, TypeScript'
      const jobDescription = 'Vaga React sênior'

      const llm = { provider: 'ollama' as const, model: 'qwen2.5-coder:7b' }
      const llmFn = vi.spyOn(await import('../llm'), 'runLLM')

      llmFn.mockResolvedValue('RESUMO\nCurrículo otimizado pela IA')
      const result = await optimizeCV(cvText, jobDescription, llm)
      expect(result).toBe('RESUMO\nCurrículo otimizado pela IA')

      llmFn.mockRejectedValue(new Error('Ollama offline'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fallback = await optimizeCV(cvText, jobDescription, llm)
      expect(fallback).toContain('EXPERIÊNCIA')
      expect(fallback).toContain('HABILIDADES')

      llmFn.mockRestore()
      warnSpy.mockRestore()
    })

    it('should ignore llm config when provider is none', async () => {
      const cvText = 'HABILIDADES\nReact, TypeScript'
      const jobDescription = 'Vaga React'
      const result = await optimizeCV(cvText, jobDescription, { provider: 'none' })
      expect(result).toContain('HABILIDADES')
    })
  })

  describe('generateCV', () => {
    it('should generate a PDF buffer from text', async () => {
      const text = 'Currículo Otimizado - John Doe'
      const outputPath = path.join(os.tmpdir(), `lazyjob-test-${Date.now()}.pdf`)
      const result = await generateCV(text, outputPath)
      expect(result).toBeDefined()
    })
  })
})
