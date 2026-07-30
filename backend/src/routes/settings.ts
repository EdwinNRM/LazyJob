import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { settingSchema } from '../lib/validation'

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

  router.put('/:key', async (req, res) => {
    try {
      const { value } = settingSchema.parse(req.body)
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
