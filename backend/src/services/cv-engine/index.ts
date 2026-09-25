import fs from 'fs'
import type { LLMConfig } from '../llm'
import { parseCV } from './parser'
import { optimizeCV } from './optimizer'
import { generateCV } from './generator'
import { analyzeAts, AtsReport } from './ats'

export interface CVEngineResult {
  originalText: string
  optimizedText: string
  pdfPath: string
  atsReport: AtsReport
  usedFallback: boolean
}

export async function processCV(
  cvPath: string,
  jobDescription: string,
  outputDir: string,
  jobId: string,
  llm?: LLMConfig
): Promise<CVEngineResult> {
  const buffer = fs.readFileSync(cvPath)
  const originalText = await parseCV(buffer)
  let usedFallback = !llm
  let optimizedText: string
  try {
    optimizedText = await optimizeCV(originalText, jobDescription, llm, () => { usedFallback = true })
  } catch {
    usedFallback = true
    optimizedText = await optimizeCV(originalText, jobDescription)
  }
  const pdfPath = `${outputDir}/cv-${jobId}.pdf`

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  await generateCV(optimizedText, pdfPath)

  return { originalText, optimizedText, pdfPath, atsReport: analyzeAts(optimizedText, jobDescription), usedFallback }
}

export { parseCV } from './parser'
export { optimizeCV } from './optimizer'
export { generateCV } from './generator'
export { analyzeAts } from './ats'
