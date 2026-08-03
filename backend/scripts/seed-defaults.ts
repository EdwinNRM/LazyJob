import { PrismaClient } from '@prisma/client'
import { DEFAULT_QUERIES, DEFAULT_LOCATIONS } from '../src/services/scheduler'

const prisma = new PrismaClient()

async function main() {
  const defaults: Record<string, string> = {
    cvBasePath: 'C:\\Users\\edwin\\Downloads\\CV_Edwin_Medina.pdf',
    searchQueries: JSON.stringify(DEFAULT_QUERIES),
    searchLocations: JSON.stringify(DEFAULT_LOCATIONS),
    autoApplyEnabled: 'false',
    browserHeadless: 'false',
    llmProvider: 'ollama',
    llmModel: 'qwen2.5-coder:7b',
    llmBaseUrl: 'http://localhost:11434',
  }

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
    console.log(`[Seed] ${key} = ${value}`)
  }

  await prisma.$disconnect()
  console.log('[Seed] Configurações padrão aplicadas.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
