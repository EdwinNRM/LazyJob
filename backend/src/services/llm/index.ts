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

export interface JobForRelevance {
  id: string
  title: string
  company: string
  location?: string | null
  description?: string | null
}

export async function filterJobsByRelevance(
  jobs: JobForRelevance[],
  expectedLocations: string[],
  llm: LLMConfig
): Promise<{ keep: string[]; remove: string[] }> {
  if (jobs.length === 0) return { keep: [], remove: [] }

  const locStr = JSON.stringify(expectedLocations)
  const jobsJson = jobs
    .map(
      (j, i) =>
        `${i}. Título: "${j.title}" | Empresa: "${j.company}" | Localização: "${j.location ?? 'não informado'}"`
    )
    .join('\n')

  const prompt = `Você é um filtro de vagas de emprego.

Localizações desejadas (do JSON de configuração): ${locStr}

Regras:
- Uma vaga FAZ SENTIDO se sua localização for "Remoto" (qualquer tipo de remoto), ou se contiver qualquer uma das localizações desejadas (ex.: "São José do Rio Preto"), ou se a localização for ambígua/indefinida ("Não informado", "Não divulgada", etc.).
- Uma vaga NÃO FAZ SENTIDO se a localização for claramente uma cidade/estado diferente das desejadas E não for remota (ex.: "São Paulo - SP", "Salvador - BA", "Rio de Janeiro - RJ").
- Responda APENAS um JSON válido no formato: {"keep":[0,2,5],"remove":[1,3,4]} com os índices (0-based) das vagas na lista abaixo.
- Não inclua nenhum texto além do JSON.
- Se não tiver certeza sobre uma vaga, mantenha (inclua em keep).

Vagas para avaliar:
${jobsJson}

JSON:`

  try {
    const raw = await runLLM(prompt, llm)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Sem JSON na resposta')

    const parsed = JSON.parse(jsonMatch[0]) as {
      keep?: number[]
      remove?: number[]
    }

    const keep = new Set(parsed.keep ?? jobs.map((_, i) => i))
    const remove = parsed.remove ?? []

    return {
      keep: jobs.filter((_, i) => keep.has(i)).map((j) => j.id),
      remove: jobs.filter((_, i) => remove.includes(i)).map((j) => j.id),
    }
  } catch (error) {
    console.warn('[Relevance] LLM falhou ao filtrar vagas, mantendo todas:', error)
    return { keep: jobs.map((j) => j.id), remove: [] }
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
  const model = config.model || 'qwen2.5-coder:7b'

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
