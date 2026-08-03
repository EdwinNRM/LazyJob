import { PrismaClient } from '@prisma/client'
import { matchesExpectedLocation } from '../src/services/scraper/utils'

const p = new PrismaClient()
const expected = ['Remoto', 'São José do Rio Preto']

function indeedJobKey(url: string): string | null {
  try {
    const u = new URL(url)
    return u.searchParams.get('jk')
  } catch {
    return null
  }
}

async function main() {
  const jobs = await p.job.findMany({ orderBy: { createdAt: 'asc' } })

  const offLocation = jobs.filter((j) => {
    const loc = (j.location || '').trim()
    if (!loc || /não informado|nao informado/i.test(loc)) return false
    return !matchesExpectedLocation(loc, expected)
  })
  const offIds = new Set(offLocation.map((j) => j.id))
  console.log('Fora da localização esperada:', offIds.size)

  const dupIds = new Set<string>()
  const seen = new Map<string, string>()
  for (const j of jobs) {
    if (offIds.has(j.id)) continue
    let key = null
    if (j.platform === 'indeed') {
      key = indeedJobKey(j.url)
    }
    if (!key) key = `${j.platform}|${(j.title || '').toLowerCase()}|${(j.company || '').toLowerCase()}`
    if (seen.has(key)) {
      dupIds.add(j.id)
    } else {
      seen.set(key, j.id)
    }
  }
  console.log('Duplicadas (mesmo jk ou title|company|platform):', dupIds.size)

  const delDup = await p.job.deleteMany({ where: { id: { in: [...dupIds] } } })
  const delLoc = await p.job.deleteMany({ where: { id: { in: [...offIds] } } })
  const remaining = await p.job.count()
  console.log(`Deletadas: ${delDup.count} duplicadas + ${delLoc.count} fora-localização = ${delDup.count + delLoc.count}`)
  console.log('Restantes no banco:', remaining)
}

main().finally(() => p.$disconnect())
