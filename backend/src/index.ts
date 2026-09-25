import 'express-async-errors'
import express, { ErrorRequestHandler } from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { jobRoutes } from './routes/jobs'
import { settingsRoutes } from './routes/settings'
import { scraperRoutes } from './routes/scraper'
import { startScheduler } from './services/scheduler'
process.env.DATABASE_URL ||= 'file:./dev.db'
export function createApp(prisma: PrismaClient) {
 const app = express()
 app.disable('x-powered-by')
 app.use((req, res, next) => {
  const host = req.hostname
  if (!['localhost','127.0.0.1','::1','[::1]'].includes(host)) return res.status(403).json({ error: 'Aplicação disponível apenas em localhost' })
  const origin = req.get('origin')
  if (origin && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin)) return res.status(403).json({ error: 'Origem não permitida' })
  next()
 })
 app.use(cors({ origin: true }))
 app.use(express.json({ limit: '1mb' }))
 app.get('/api/health', async (_req, res) => { await prisma.setting.count(); res.json({ status: 'ok' }) })
 app.use('/api/jobs', jobRoutes(prisma))
 app.use('/api/settings', settingsRoutes(prisma))
 app.use('/api/scrape', scraperRoutes(prisma))
 app.use('/api', (_req, res) => { res.status(404).json({ error: 'Rota não encontrada' }) })
 const frontend = path.resolve(__dirname, '../../frontend/dist')
 if (fs.existsSync(frontend)) {
  app.use(express.static(frontend))
  app.get('*', (_req, res) => res.sendFile(path.join(frontend, 'index.html')))
 }
 const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error('[API]', error.message)
  const status = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : error.status || 500
  res.status(status).json({ error: status === 404 ? 'Registro não encontrado' : status === 409 ? 'Registro duplicado' : status === 500 ? 'Erro interno. Consulte o log do servidor.' : error.message })
 }
 app.use(errors)
 return app
}
export const prisma = new PrismaClient()
export const app = createApp(prisma)
export async function startServer() {
 await prisma.$connect()
 // Work interrupted by process shutdown cannot remain running forever.
 await prisma.job.updateMany({ where: { cvStatus: 'generating' }, data: { cvStatus: 'error', cvError: 'Geração interrompida. Gere uma nova versão.' } })
 await prisma.scrapeRun.updateMany({ where: { status: { in: ['queued','running'] } }, data: { status: 'failed', finishedAt: new Date(), errorMessage: 'Coleta interrompida pela parada do servidor' } })
 const port = Number(process.env.PORT || 3001)
 const server = app.listen(port, '127.0.0.1', () => console.log('[LazyJob] http://127.0.0.1:' + port))
 const tasks = process.env.DISABLE_SCHEDULER === '1' ? [] : startScheduler(prisma)
 const stop = () => { tasks.forEach(t => t.stop()); server.close(() => { void prisma.$disconnect().then(() => process.exit(0)) }) }
 process.once('SIGINT', stop); process.once('SIGTERM', stop)
 return server
}
if (require.main === module) void startServer().catch(error => { console.error('Falha ao iniciar. Execute npm run setup antes de iniciar.', error.message); process.exitCode = 1 })
