import { afterEach, describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { generateCV } from './generator'
import { parseCV } from './parser'

const files: string[] = []
afterEach(() => files.splice(0).forEach((file) => fs.rmSync(file, { force: true })))

describe('gerador de PDF', () => {
  it('pagina currículos longos sem cortar o conteúdo', async () => {
    const output = path.join(os.tmpdir(), `lazyjob-cv-${Date.now()}.pdf`)
    files.push(output)
    await generateCV(Array.from({ length: 180 }, (_, i) => `Experiência comprovada linha ${i}`).join('\n'), output)
    const pdf = await PDFDocument.load(fs.readFileSync(output))
    expect(pdf.getPageCount()).toBeGreaterThan(1)
    const text = await parseCV(fs.readFileSync(output))
    expect(text).toContain('linha 0')
    expect(text).toContain('linha 179')
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28)
  })
})

it('informa caracteres sem glifo em vez de produzir um PDF incompleto', async () => {
 await expect(generateCV('Nome 😀', path.join(os.tmpdir(),'lazyjob-unsupported.pdf'))).rejects.toThrow('não suportados')
})
