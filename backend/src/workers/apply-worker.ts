import { startApplyWorker } from '../services/apply/apply-worker'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

startApplyWorker(prisma).catch(console.error)
