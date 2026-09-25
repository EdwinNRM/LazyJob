import { PrismaClient } from '@prisma/client'
import { DEFAULT_QUERIES, DEFAULT_LOCATIONS } from '../src/services/scheduler'

process.env.DATABASE_URL ||= 'file:./dev.db'
const prisma = new PrismaClient()

async function main() {
  const defaults: Record<string, string> = {
    cvBasePath: '',
    searchQueries: JSON.stringify(DEFAULT_QUERIES),
    searchLocations: JSON.stringify(DEFAULT_LOCATIONS),
    llmProvider: 'none',
    llmModel: 'qwen3:8b',
    llmBaseUrl: 'http://localhost:11434',
    enabledSources: JSON.stringify(['nerdin']),
    rssUrls: '[]',
    publicApiUrls: '[]',
  }

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
    console.log(`[Seed] ${key}: preservado ou criado`)
  }

  await prisma.$disconnect()
  console.log('[Seed] Configurações padrão aplicadas.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
