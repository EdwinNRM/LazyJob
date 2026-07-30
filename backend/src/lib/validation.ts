import { z } from 'zod'

export const VALID_STATUSES = [
  'discovered',
  'analyzing',
  'adjusting_cv',
  'applying',
  'applied',
  'rejected',
] as const

export const createJobSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  company: z.string().min(1, 'Empresa é obrigatória'),
  platform: z.enum(['linkedin', 'indeed', 'gupy', 'glassdoor']),
  url: z.string().url('URL inválida'),
  description: z.string(),
  salary: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
})

export const updateJobSchema = z.object({
  title: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  platform: z.enum(['linkedin', 'indeed', 'gupy', 'glassdoor']).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  salary: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.enum(VALID_STATUSES).optional(),
  columnOrder: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
  cvPath: z.string().nullable().optional(),
  appliedAt: z.string().nullable().optional(),
})

export const scrapeRequestSchema = z.object({
  queries: z.array(z.string()).min(1, 'Pelo menos uma query é necessária'),
  locations: z.array(z.string()).optional().default([]),
  platforms: z.array(z.enum(['linkedin', 'indeed', 'gupy', 'glassdoor'])).optional(),
})

export const settingSchema = z.object({
  value: z.string().min(1, 'Valor é obrigatório'),
})
