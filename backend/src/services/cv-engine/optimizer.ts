import type { LLMConfig } from '../llm'
import { runLLM } from '../llm'

export async function optimizeCV(
  cvText: string,
  jobDescription: string,
  llm?: LLMConfig
): Promise<string> {
  if (llm && llm.provider && llm.provider !== 'none') {
    try {
      const prompt = buildLLMPrompt(cvText, jobDescription)
      const result = await runLLM(prompt, llm)
      if (result.trim()) return result.trim()
    } catch (error) {
      console.warn('[Optimizer] LLM falhou, usando fallback local:', error)
    }
  }

  const sections = extractSections(cvText)
  const keywords = extractKeywords(jobDescription)

  const optimizedSections = {
    ...sections,
    skills: prioritizeSkills(sections.skills || '', keywords),
    summary: generateOptimizedSummary(sections.summary || sections.experience || '', keywords),
  }

  return formatCV(optimizedSections)
}

function buildLLMPrompt(cvText: string, jobDescription: string): string {
  return `Você é um especialista em otimização de currículos para o mercado brasileiro de TI.

Reescreva o currículo abaixo para maximizar o encaixe com a vaga, seguindo estas regras:
- Responda APENAS com o currículo otimizado em português, sem comentários nem introdução.
- Reorganize as seções priorizando o que a vaga pede: resumo/objetivo, experiências, habilidades, educação, certificações, idiomas.
- Destaque palavras-chave e habilidades da descrição da vaga quando existirem no currículo.
- NÃO invente experiências, empresas, certificações ou dados que não estejam no currículo original.
- Mantenha os fatos e dados de contato do original; apenas reordene e reformule o texto.
- Se a vaga pedir algo ausente no currículo, não invente — apenas não cite.

DESCRIÇÃO DA VAGA:
${jobDescription}

CURRÍCULO ORIGINAL:
${cvText}`
}

function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const sectionHeaders = [
    { key: 'summary', patterns: [/resumo/i, /sumário/i, /objetivo/i, /profile/i, /summary/i] },
    { key: 'experience', patterns: [/experiência/i, /experiencia/i, /experience/i] },
    { key: 'education', patterns: [/educação/i, /educacao/i, /formação/i, /formacao/i, /education/i] },
    { key: 'skills', patterns: [/habilidades/i, /competências/i, /skills/i, /technical skills/i] },
    { key: 'certifications', patterns: [/certificações/i, /certificacoes/i, /certifications/i] },
    { key: 'languages', patterns: [/idiomas/i, /languages/i] },
  ]

  let remaining = text
  let lastIndex = 0
  let lastKey = ''

  const matches: { index: number; key: string }[] = []

  for (const header of sectionHeaders) {
    for (const pattern of header.patterns) {
      const match = remaining.match(pattern)
      if (match && match.index !== undefined) {
        const globalIndex = text.indexOf(remaining) + match.index
        matches.push({ index: globalIndex, key: header.key })
        break
      }
    }
  }

  matches.sort((a, b) => a.index - b.index)

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = matches[i + 1]?.index || text.length
    const sectionText = text.substring(start, end).replace(/^[^\n]*\n?/, '').trim()
    sections[matches[i].key] = sectionText
  }

  if (Object.keys(sections).length === 0) {
    sections.experience = text
  }

  return sections
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'de', 'da', 'do', 'em', 'para', 'com', 'que', 'dos', 'das',
    'e', 'ou', 'é', 'uma', 'um', 'no', 'na', 'se', 'por', 'mais', 'como',
  ])

  const words = text
    .replace(/[^\w\sÀ-ü]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
    .map(w => w.toLowerCase())

  const frequency: Record<string, number> = {}
  words.forEach((w) => {
    frequency[w] = (frequency[w] || 0) + 1
  })

  return Object.entries(frequency)
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .map(([word]) => word)
}

function prioritizeSkills(skillsText: string | undefined, keywords: string[]): string {
  if (!skillsText) return ''
  const skillItems = skillsText
    .split(/[,;.\n]/)
    .map(s => s.trim())
    .filter(Boolean)

  const scored = skillItems.map(skill => {
    const score = keywords.reduce((acc, kw) => {
      return acc + (skill.toLowerCase().includes(kw) ? 1 : 0)
    }, 0)
    return { skill, score }
  })

  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  const unmatched = scored.filter(s => s.score === 0)

  return [...matched, ...unmatched]
    .map(s => s.skill)
    .join(', ')
}

function generateOptimizedSummary(experience: string, keywords: string[]): string {
  const topKeywords = keywords.slice(0, 5)
  const keywordStr = topKeywords.join(', ')

  const lines = experience.split('\n').filter(l => l.trim())
  const relevantLines = lines.filter(line =>
    keywords.some(kw => line.toLowerCase().includes(kw))
  )

  if (relevantLines.length > 0) {
    return relevantLines.slice(0, 3).join('\n')
  }

  return `Profissional com experiência em ${keywordStr}. Buscando oportunidade para aplicar e expandir conhecimentos na área.`
}

function formatCV(sections: Record<string, string>): string {
  const parts: string[] = []

  if (sections.summary) parts.push(`RESUMO\n${sections.summary}`)
  if (sections.experience) parts.push(`EXPERIÊNCIA\n${sections.experience}`)
  if (sections.education) parts.push(`EDUCAÇÃO\n${sections.education}`)
  if (sections.skills) parts.push(`HABILIDADES\n${sections.skills}`)
  if (sections.certifications) parts.push(`CERTIFICAÇÕES\n${sections.certifications}`)
  if (sections.languages) parts.push(`IDIOMAS\n${sections.languages}`)

  return parts.join('\n\n')
}
