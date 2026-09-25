import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
export async function generateCV(text: string, outputPath: string): Promise<string> {
 if (!text.trim()) throw new Error('O currículo não pode ficar vazio')
 const doc = await PDFDocument.create()
 doc.registerFontkit(fontkit)
 const fontsDir = path.resolve(__dirname, '../../../assets/fonts')
 const font = await doc.embedFont(fs.readFileSync(path.join(fontsDir, 'NotoSans-Regular.ttf')), { subset: true })
 const bold = await doc.embedFont(fs.readFileSync(path.join(fontsDir, 'NotoSans-Bold.ttf')), { subset: true })
 const supported = new Set(font.getCharacterSet())
 const clean = text.replace(/\r/g, '').replace(/\t/g, '    ')
 const unsupported = [...new Set([...clean].filter(c => c !== '\n' && !supported.has(c.codePointAt(0)!)))]
 if (unsupported.length) throw new Error('Caracteres não suportados pelo PDF: ' + unsupported.join(' ') + '. Substitua-os no texto revisado.')
 const margin = 48, width = 595.28, height = 841.89, maxWidth = width - margin * 2
 let page = doc.addPage([width, height]), y = height - margin
 for (const line of clean.split('\n')) {
  const title = /\p{L}/u.test(line) && line.trim() === line.toUpperCase() && line.length < 180
  const face = title ? bold : font, size = title ? 12 : 10, spacing = title ? 19 : 15
  if (title && y < margin + 3 * spacing) { page = doc.addPage([width, height]); y = height - margin }
  const wrapped: string[] = []
  let current = ''
  // Character-level fallback also wraps long URLs and unbroken words.
  for (const char of line) {
   if (face.widthOfTextAtSize(current + char, size) > maxWidth && current) {
    const space = current.lastIndexOf(' ')
    if (space > current.length / 2) { wrapped.push(current.slice(0, space)); current = current.slice(space + 1) }
    else { wrapped.push(current); current = '' }
   }
   current += char
  }
  wrapped.push(current)
  for (const row of wrapped) {
   if (y < margin + spacing) { page = doc.addPage([width, height]); y = height - margin }
   if (row.trim()) page.drawText(row, { x: margin, y, size, font: face, color: rgb(0.12,0.15,0.2) })
   y -= row.trim() ? spacing : 8
  }
 }
 fs.mkdirSync(path.dirname(outputPath), { recursive: true })
 const temporary = outputPath + '.' + randomUUID() + '.tmp'
 try { fs.writeFileSync(temporary, await doc.save()); fs.renameSync(temporary, outputPath) }
 finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
 return outputPath
}
