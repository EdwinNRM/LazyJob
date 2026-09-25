import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import type { PrismaClient } from '@prisma/client'
import { readLLMConfig } from '../llm'
import { parseCV } from './parser'
import { optimizeCV } from './optimizer'
import { generateCV } from './generator'
import { analyzeAts } from './ats'
const busy = new Set<string>()
export function isGenerating(jobId: string) { return busy.has(jobId) }
function outputPath() { return path.resolve(process.env.CV_OUTPUT_DIR || 'generated-cvs', 'cv-' + randomUUID() + '.pdf') }
export async function generateCvVersion(prisma: PrismaClient, jobId: string) {
 if (busy.has(jobId)) throw new Error('Já existe uma geração em andamento')
 busy.add(jobId)
 let pdfPath: string | undefined
 try {
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new Error('Vaga não encontrada')
  await prisma.job.update({ where: { id: jobId }, data: { cvStatus: 'generating', cvError: null } })
  const canonical = await prisma.setting.findUnique({ where: { key: 'cvBaseText' } })
  const originalText = canonical?.value.trim() || await extractBaseCv(prisma)
  const llm = await readLLMConfig(prisma)
  let usedFallback = !llm || llm.provider === 'none'
  const optimizedText = await optimizeCV(originalText, job.description, llm, () => { usedFallback = true })
  pdfPath = outputPath()
  await generateCV(optimizedText, pdfPath)
  return await prisma.$transaction(async tx => {
   const version = await tx.cvVersion.create({ data: { jobId, originalText, optimizedText, pdfPath: pdfPath!,
    atsReport: JSON.stringify(analyzeAts(optimizedText, job.description)), model: usedFallback ? 'texto-original' : llm!.model || llm!.provider,
    promptVersion: 'v2-section-order', usedFallback } })
   await tx.job.update({ where: { id: jobId }, data: { cvStatus: 'ready', cvError: null, cvPath: version.pdfPath, activeCvVersionId: version.id } })
   return version
  })
 } catch (error) {
  if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
  await prisma.job.updateMany({ where: { id: jobId }, data: { cvStatus: 'error', cvError: error instanceof Error ? error.message : String(error) } })
  throw error
 } finally { busy.delete(jobId) }
}
export async function extractBaseCv(prisma: PrismaClient) {
 const setting = await prisma.setting.findUnique({ where: { key: 'cvBasePath' } })
 if (!setting?.value || path.extname(setting.value).toLowerCase() !== '.pdf' || !fs.existsSync(setting.value)) throw new Error('Cole o texto do currículo nas configurações ou configure um PDF válido')
 if (fs.statSync(setting.value).size > 15 * 1024 * 1024) throw new Error('O PDF deve ter até 15 MB')
 return parseCV(fs.readFileSync(setting.value))
}
export async function updateCvVersion(prisma: PrismaClient, jobId: string, versionId: string, optimizedText: string) {
 const version = await prisma.cvVersion.findFirst({ where: { id: versionId, jobId }, include: { job: true } })
 if (!version) throw new Error('Versão de currículo não encontrada')
 const pdfPath = outputPath()
 await generateCV(optimizedText, pdfPath)
 try {
  return await prisma.$transaction(async tx => {
   const next = await tx.cvVersion.create({ data: { jobId, originalText: version.originalText, optimizedText, pdfPath,
    atsReport: JSON.stringify(analyzeAts(optimizedText, version.job.description)), model: 'revisão-manual', promptVersion: version.promptVersion, usedFallback: false } })
   await tx.job.update({ where: { id: jobId }, data: { activeCvVersionId: next.id, cvPath: pdfPath, cvStatus: 'ready', cvError: null } })
   return next
  })
 } catch (error) { fs.unlinkSync(pdfPath); throw error }
}
