import { describe, expect, it } from 'vitest'
import { analyzeAts } from './ats'

describe('análise ATS', () => {
  it('separa termos presentes e ausentes', () => {
    const report = analyzeAts('EXPERIÊNCIA\nDesenvolvimento com TypeScript e React em sistemas web.'.repeat(20), 'TypeScript React Node Node AWS AWS')
    expect(report.matchedKeywords).toContain('typescript')
    expect(report.missingKeywords).toContain('aws')
    expect(report.score).toBeGreaterThan(0)
  })
})
