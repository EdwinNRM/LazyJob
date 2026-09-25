import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { settingSchema, validateSetting } from '../lib/validation'
import { extractBaseCv } from '../services/cv-engine/workflow'

export function settingsRoutes(prisma: PrismaClient) {
  const router = Router()

  router.get('/', async (_req, res) => {
    try {
      const settings = await prisma.setting.findMany()
      const map: Record<string, string> = {}
      settings.forEach((s) => { map[s.key] = s.value })
      res.json(map)
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar configurações' })
    }
  })

  router.get('/cv-base/preview', async (_req, res) => {
    try { res.json({ text: await extractBaseCv(prisma) }) }
    catch (error) { res.status(400).json({ error: String(error) }) }
  })

  router.get('/:key', async (req, res) => {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: req.params.key },
      })

      if (!setting) {
        return res.status(404).json({ error: 'Configuração não encontrada' })
      }

      res.json({ key: setting.key, value: setting.value })
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar configuração' })
    }
  })


  router.put('/', async (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new Error('Configurações inválidas')
      const entries = Object.entries(req.body).map(([key, raw]) => [key, validateSetting(key, settingSchema.parse({ value: raw }).value)])
      await prisma.$transaction(entries.map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })))
      res.json({ saved: entries.length })
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Dados inválidos' }) }
  })

  router.put('/:key', async (req, res) => {
    try {
      const value = validateSetting(req.params.key, settingSchema.parse(req.body).value)
      const setting = await prisma.setting.upsert({
        where: { key: req.params.key },
        update: { value },
        create: { key: req.params.key, value },
      })
      res.json(setting)
    } catch (error) {
      res.status(400).json({ error: 'Dados inválidos', details: error })
    }
  })

  return router
}
