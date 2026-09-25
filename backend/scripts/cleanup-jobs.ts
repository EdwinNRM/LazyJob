// Legacy command retained as a read-only audit; it must never delete candidatures.
import { PrismaClient } from '@prisma/client'
import { classifyJob } from '../src/services/classification'
import { dedupKey } from '../src/services/scraper/utils'
process.env.DATABASE_URL ||= 'file:./dev.db'
const prisma = new PrismaClient()
async function main() {
 const jobs = await prisma.job.findMany()
 const keys = new Set<string>()
 let duplicates = 0, accepted = 0, pending = 0
 for (const job of jobs) {
  const key = dedupKey(job); if (keys.has(key)) duplicates++; keys.add(key)
  const result = classifyJob(job)
  if (result.accepted) accepted++
  else if (result.confidence < 0.7) pending++
 }
 console.log({ total: jobs.length, accepted, pending, possibleDuplicates: duplicates })
 console.log('Auditoria somente leitura. Nenhuma vaga foi alterada ou removida.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
