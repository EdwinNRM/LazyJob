import { describe, it, expect, vi, afterEach } from 'vitest'
import { runLLM } from './index'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runLLM', () => {
  it('chama o Ollama com o modelo e retorna o texto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'Currículo otimizado pela IA' }),
        text: async () => '',
      })
    )

    const result = await runLLM('prompt', { provider: 'ollama', model: 'qwen2.5-coder:7b' })
    expect(result).toBe('Currículo otimizado pela IA')

    const fetchMock = vi.mocked(fetch)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:11434/api/generate')
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'qwen2.5-coder:7b',
      stream: false,
      prompt: 'prompt',
    })
  })

  it('lança erro quando o provedor é none', async () => {
    await expect(runLLM('prompt', { provider: 'none' })).rejects.toThrow(
      'Nenhum provedor LLM configurado'
    )
  })

  it('lança erro quando o Ollama responde com status não-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'model not found',
      })
    )

    await expect(
      runLLM('prompt', { provider: 'ollama', model: 'inexistente' })
    ).rejects.toThrow(/500/)
  })
})
