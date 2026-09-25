import { normalizeText } from './scraper/utils'

export interface ClassifiableJob {
  title: string
  description?: string | null
  location?: string | null
}

export interface Classification {
  accepted: boolean
  workMode: 'remote' | 'hybrid' | 'onsite' | 'unknown'
  brazilEligible: boolean
  isTech: boolean
  confidence: number
  reason: string
  seniority?: string
  technologies: string[]
}

const TECH_TERMS = [
  'desenvolvedor', 'developer', 'software', 'sistemas', 'dados', 'data ', 'devops',
  'cloud', 'qa', 'testes', 'infraestrutura', 'seguranca', 'cyber',
  'product owner', 'scrum', 'ux', 'ui ', 'suporte ti', 'dba', 'sap', 'programador',
  'engenheiro de dados', 'analista de ti', 'tecnologia da informacao',
]
const TECHS = ['javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'python', 'java', '.net', 'c#', 'php', 'ruby', 'go', 'kotlin', 'swift', 'sql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'power bi', 'sap']
const FOREIGN_ONLY = ['united states only', 'us only', 'usa only', 'europe only', 'eu only', 'uk only', 'canada only', 'apenas estados unidos', 'somente europa']

export function classifyJob(job: ClassifiableJob): Classification {
  const text = normalizeText(`${job.title} ${job.location ?? ''} ${job.description ?? ''}`)
  const hybrid = /\b(hibrid|hybrid)/.test(text)
  const onsite = /\b(presencial|on[- ]?site)/.test(text)
  const remote = /\b(remot|home office|trabalho remoto|100% home)/.test(text) && !hybrid && !onsite && !/\b(not remote|nao remoto|sem home office)\b/.test(text)
  const foreignOnly = FOREIGN_ONLY.some((term) => text.includes(term)) || /(?:must|only|required).{0,45}(?:reside|resident|based|authorized).{0,30}(?:united states|usa|canada|europe|uk)\b/.test(text) || /\b(remote|remoto)\s*[-–,:(]\s*(us|usa|uk|canada|europe)\b/.test(normalizeText(job.location || ''))
  const brazilSignal = /\b(brasil|brazil|worldwide|anywhere in the world|latam|latin america|america latina|global remote)\b/.test(text)
  const has = (term: string) => (' ' + text.replace(/[,;:()\n]/g, ' ') + ' ').includes(' ' + term.trim() + ' ')
  const isTech = TECH_TERMS.some(has) || TECHS.some(has)
  const technologies = TECHS.filter(has)
  const seniority = /\bsenior|sr\.?\b/.test(text) ? 'senior'
    : /\bpleno|mid[- ]?level\b/.test(text) ? 'pleno'
    : /\bjunior|jr\.?|estagio|trainee\b/.test(text) ? 'junior' : undefined
  const workMode = hybrid ? 'hybrid' : onsite && !remote ? 'onsite' : remote ? 'remote' : 'unknown'
  // Require explicit evidence; remote alone does not establish country eligibility.
  const brazilEligible = remote && !foreignOnly && brazilSignal
  const accepted = remote && brazilEligible && isTech
  const confidence = remote && isTech && !brazilSignal && !foreignOnly ? 0.45 : workMode === 'unknown' ? 0.45 : 0.9
  const reason = !remote ? `Modalidade ${workMode}; exige trabalho 100% remoto`
    : foreignOnly ? 'Vaga remota restrita a outro país/região'
    : !isTech ? 'Não foram encontrados sinais suficientes de vaga de TI'
    : 'Vaga de TI remota e elegível para residentes no Brasil'

  return { accepted, workMode, brazilEligible, isTech, confidence, reason, seniority, technologies }
}

export function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value)
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'trk', 'ref'].forEach((key) => url.searchParams.delete(key))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value.trim()
  }
}
