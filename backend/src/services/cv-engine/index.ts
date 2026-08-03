import fs from 'fs'
import type { LLMConfig } from '../llm'
import { parseCV } from './parser'
import { optimizeCV } from './optimizer'
import { generateCV } from './generator'

export interface CVEngineResult {
  originalText: string
  optimizedText: string
  pdfPath: string
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
  const optimizedText = await optimizeCV(originalText, jobDescription, llm)
  const pdfPath = `${outputDir}/cv-${jobId}.pdf`

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  await generateCV(optimizedText, pdfPath)

  return { originalText, optimizedText, pdfPath }
}

export { parseCV } from './parser'
export { optimizeCV } from './optimizer'
export { generateCV } from './generator'
