import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { jobRoutes } from './routes/jobs'
import { settingsRoutes } from './routes/settings'
import { scraperRoutes } from './routes/scraper'
import { startScheduler } from './services/scheduler'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/jobs', jobRoutes(prisma))
app.use('/api/settings', settingsRoutes(prisma))
app.use('/api/scrape', scraperRoutes(prisma))

export function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`[LazyJob] Backend rodando em http://localhost:${PORT}`)
    startScheduler(prisma)
  })

  return server
}

if (process.env.NODE_ENV !== 'test') {
  startServer()
}

export { app, prisma }
