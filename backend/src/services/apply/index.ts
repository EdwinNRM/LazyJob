import { PrismaClient, Job } from '@prisma/client'
import path from 'path'
import { processCV } from '../cv-engine'
import { applyLinkedIn } from './linkedin-apply'
import { applyIndeed } from './indeed-apply'
import { applyGupy } from './gupy-apply'
import { applyGlassdoor } from './glassdoor-apply'

const CV_OUTPUT_DIR = path.join(process.cwd(), 'generated-cvs')

export async function applyForJob(prisma: PrismaClient, job: Job): Promise<boolean> {
  console.log(`[Apply] Iniciando candidatura para: ${job.title} em ${job.company}`)

  try {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'applying' },
    })

    const cvSetting = await prisma.setting.findUnique({ where: { key: 'cvBasePath' } })
    const cvPath = cvSetting?.value || path.join(process.cwd(), 'cv-base.pdf')

    if (!require('fs').existsSync(cvPath)) {
      console.log(`[Apply] CV não encontrado em ${cvPath}. Pulando geração.`)
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'adjusting_cv' },
      })
      return false
    }

    console.log(`[Apply] Gerando CV otimizado...`)
    const cvResult = await processCV(cvPath, job.description, CV_OUTPUT_DIR, job.id)

    await prisma.job.update({
      where: { id: job.id },
      data: { cvPath: cvResult.pdfPath },
    })

    const appliers: Record<string, (job: Job, cvPath: string) => Promise<boolean>> = {
      linkedin: applyLinkedIn,
      indeed: applyIndeed,
      gupy: applyGupy,
      glassdoor: applyGlassdoor,
    }

    const applier = appliers[job.platform]
    if (!applier) {
      console.log(`[Apply] Plataforma ${job.platform} não suportada`)
      return false
    }

    const success = await applier(job, cvResult.pdfPath)

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: success ? 'applied' : 'analyzing',
        appliedAt: success ? new Date() : undefined,
      },
    })

    console.log(`[Apply] ${success ? 'SUCESSO' : 'FALHA'} - ${job.title}`)
    return success
  } catch (error) {
    console.error(`[Apply] Erro ao candidatar para ${job.title}:`, error)

    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'analyzing' },
    })

    return false
  }
}
