import { z } from 'zod'
export const VALID_STATUSES = ['discovered','analyzing','adjusting_cv','ready_to_apply','applied','rejected'] as const
export const SOURCES = ['linkedin','indeed','gupy','glassdoor','nerdin','rss','api'] as const
export const httpUrl = z.string().url().refine(v => /^https?:\/\//i.test(v), 'Use uma URL HTTP ou HTTPS')
export const createJobSchema = z.object({
 title: z.string().trim().min(1).max(500), company: z.string().trim().min(1).max(500),
 platform: z.enum([...SOURCES, 'manual']), url: httpUrl, description: z.string().max(100000),
 salary: z.string().max(500).nullable().optional(), location: z.string().max(500).nullable().optional(),
})
export const updateJobSchema = createJobSchema.partial().extend({
 status: z.enum(VALID_STATUSES).optional(), columnOrder: z.number().int().min(0).optional(),
 notes: z.string().max(50000).nullable().optional(), appliedAt: z.string().datetime().nullable().optional(),
}).strict()
export const scrapeRequestSchema = z.object({
 queries: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
 locations: z.array(z.string().trim().min(1).max(200)).max(10).default(['Remoto Brasil']),
 platforms: z.array(z.enum(SOURCES)).min(1).max(7).optional(),
})
export const settingSchema = z.object({ value: z.string().max(100000) })
export function validateSetting(key: string, value: string) {
 const plain = ['cvBasePath','cvBaseText','llmModel','llmApiKey']
 if (plain.includes(key)) return value
 if (key === 'llmProvider') return z.enum(['none','ollama','openai','anthropic']).parse(value)
 if (key === 'llmBaseUrl') return value ? httpUrl.parse(value) : ''
 let parsed: unknown
 try { parsed = JSON.parse(value) } catch { throw new Error(key + ': use uma lista JSON válida') }
 if (key === 'enabledSources') z.array(z.enum(SOURCES)).max(7).parse(parsed)
 else if (['rssUrls','publicApiUrls'].includes(key)) z.array(httpUrl).max(30).parse(parsed)
 else if (['searchQueries','searchLocations'].includes(key)) z.array(z.string().trim().min(1).max(200)).min(1).max(20).parse(parsed)
 else throw new Error('Configuração desconhecida')
 return JSON.stringify(parsed)
}
