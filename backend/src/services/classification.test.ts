import { describe, expect, it } from 'vitest'
import { canonicalizeUrl, classifyJob } from './classification'

describe('classificação de vagas', () => {
  it('aceita vaga remota de TI no Brasil', () => {
    expect(classifyJob({ title: 'Desenvolvedor Python', location: 'Home Office - Brasil' }).accepted).toBe(true)
  })
  it('rejeita remoto restrito aos EUA', () => {
    expect(classifyJob({ title: 'Software Developer', location: 'Remote - US only' }).accepted).toBe(false)
  })
  it('rejeita híbrida e presencial', () => {
    expect(classifyJob({ title: 'Analista de Sistemas', location: 'Híbrido - São Paulo' }).accepted).toBe(false)
    expect(classifyJob({ title: 'Analista de Sistemas', location: 'Presencial' }).accepted).toBe(false)
  })
  it('rejeita vaga remota fora de TI', () => {
    expect(classifyJob({ title: 'Assistente Administrativo', location: 'Remoto - Brasil' }).accepted).toBe(false)
  })
  it('remove parâmetros de rastreamento da URL', () => {
    expect(canonicalizeUrl('https://example.com/job/1?utm_source=x&id=2#top')).toBe('https://example.com/job/1?id=2')
  })
})

it('não infere Brasil a partir de idioma ou remoto isoladamente', () => {
 const r = classifyJob({ title: 'Software Developer', location: 'Remote' })
 expect(r.accepted).toBe(false); expect(r.confidence).toBeLessThan(0.7)
 expect(classifyJob({ title: 'Assistente de negócios', location: 'Remoto Brasil' }).isTech).toBe(false)
 expect(classifyJob({ title: 'Python Developer', location: 'Remote worldwide' }).accepted).toBe(true)
 expect(classifyJob({ title: 'Python Developer', location: 'Remote - US' }).accepted).toBe(false)
 expect(classifyJob({ title: 'Python Developer', location: 'Brasil', description: 'Not remote' }).accepted).toBe(false)
})
