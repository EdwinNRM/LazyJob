import type { PrismaClient } from '@prisma/client'

export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'none'

export interface LLMConfig {
  provider: LLMProvider
  model?: string
  apiKey?: string
  baseUrl?: string
}

export async function readLLMConfig(prisma: PrismaClient): Promise<LLMConfig | undefined> {
  const get = async (key: string) => {
    const s = await prisma.setting.findUnique({ where: { key } })
    return s?.value
  }

  const provider = await get('llmProvider')
  if (!provider || provider === 'none') return undefined

  return {
    provider: provider as LLMConfig['provider'],
    model: (await get('llmModel')) || undefined,
    apiKey: (await get('llmApiKey')) || undefined,
    baseUrl: (await get('llmBaseUrl')) || undefined,
  }
}

export async function runLLM(prompt: string, config: LLMConfig): Promise<string> {
  switch (config.provider) {
    case 'ollama':
      return runOllama(prompt, config)
    case 'openai':
      return runOpenAI(prompt, config)
    case 'anthropic':
      return runAnthropic(prompt, config)
    default:
      throw new Error('Nenhum provedor LLM configurado')
  }
}

async function runOllama(prompt: string, config: LLMConfig): Promise<string> {
  const baseUrl = config.baseUrl || 'http://localhost:11434'
  const model = config.model || 'qwen3:8b'

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal: AbortSignal.timeout(120000),
  })

  if (!res.ok) {
    throw new Error(`Ollama retornou HTTP ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as { response?: string }
  return data.response || ''
}

async function runOpenAI(prompt: string, config: LLMConfig): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://api.openai.com').replace(/\/$/, '')
  const model = config.model || 'gpt-4o-mini'

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey || ''}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(120000),
  })

  if (!res.ok) {
    throw new Error(`OpenAI retornou HTTP ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return data.choices?.[0]?.message?.content || ''
}

async function runAnthropic(prompt: string, config: LLMConfig): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')
  const model = config.model || 'claude-3-5-haiku-latest'

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(120000),
  })

  if (!res.ok) {
    throw new Error(`Anthropic retornou HTTP ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as {
    content?: { type?: string; text?: string }[]
  }
  return data.content?.map((c) => c.text || '').join('') || ''
}
