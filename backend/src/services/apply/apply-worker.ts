import { PrismaClient } from '@prisma/client'
import { applyForJob } from './index'

const QUEUE_INTERVAL = 10000
const BATCH_SIZE = 3

export async function startApplyWorker(prisma: PrismaClient) {
  console.log('[Apply Worker] Iniciado. Verificando vagas pendentes...')

  setInterval(async () => {
    try {
      const pendingJobs = await prisma.job.findMany({
        where: { status: 'applying' },
        take: BATCH_SIZE,
        orderBy: { updatedAt: 'asc' },
      })

      if (pendingJobs.length === 0) return

      console.log(`[Apply Worker] ${pendingJobs.length} vaga(s) pendente(s) de candidatura`)

      for (const job of pendingJobs) {
        await applyForJob(prisma, job)
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000))
      }
    } catch (error) {
      console.error('[Apply Worker] Erro:', error)
    }
  }, QUEUE_INTERVAL)
}
