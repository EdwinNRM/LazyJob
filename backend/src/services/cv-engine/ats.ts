import { normalizeText } from '../scraper/utils'

const STOP = new Set(['para', 'com', 'uma', 'das', 'dos', 'que', 'the', 'and', 'de', 'em', 'por', 'ser'])

export interface AtsReport {
  score: number
  matchedKeywords: string[]
  missingKeywords: string[]
  warnings: string[]
  readable: boolean
}

export function analyzeAts(cvText: string, jobDescription: string): AtsReport {
  const tokenize = (s: string) => normalizeText(s).match(/c\+\+|c#|\.net|[a-z0-9]+/g) ?? []
  const cv = new Set(tokenize(cvText))
  const tokens = tokenize(jobDescription)
  const counts = new Map<string, number>()
  tokens.filter((t) => !STOP.has(t) && (t.length > 2 || ['c#','go'].includes(t))).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1))
  const keywords = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([word]) => word)
  const matchedKeywords = keywords.filter((word) => cv.has(word))
  const missingKeywords = keywords.filter((word) => !cv.has(word))
  const warnings: string[] = ['Cobertura de palavras-chave; não prevê aprovação em ATS nem seleção.']
  if (!jobDescription.trim()) warnings.push('Adicione a descrição da vaga para comparar palavras-chave')
  if (cvText.length < 500) warnings.push('Currículo muito curto ou extração incompleta')
  if (cvText.length > 12000) warnings.push('Currículo muito longo para leitura rápida')
  if (!/experi[eê]ncia/i.test(cvText)) warnings.push('Seção de experiência não identificada')
  const score = keywords.length ? Math.round((matchedKeywords.length / keywords.length) * 100) : 0
  return { score, matchedKeywords, missingKeywords, warnings, readable: cvText.trim().length > 0 }
}
