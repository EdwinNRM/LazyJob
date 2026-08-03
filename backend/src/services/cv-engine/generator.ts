import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export async function generateCV(text: string, outputPath: string): Promise<string> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  const margin = 50
  const maxWidth = 500
  const lineHeight = 14
  const fontSize = 10
  const titleSize = 14

  const lines = text.split('\n')
  const pages: string[][] = []
  let currentPage: string[] = []

  for (const line of lines) {
    if (line.trim() === line.toUpperCase() && line.trim().length > 0) {
      currentPage.push(`__TITLE__:${line.trim()}`)
    } else {
      const words = line.split(' ')
      let wrapped = ''
      for (const word of words) {
        const test = wrapped ? `${wrapped} ${word}` : word
        const width = font.widthOfTextAtSize(test, fontSize)
        if (width > maxWidth && wrapped) {
          currentPage.push(wrapped)
          wrapped = word
        } else {
          wrapped = test
        }
      }
      if (wrapped) currentPage.push(wrapped)

      currentPage.push('')
    }
  }

  pages.push(currentPage)

  for (const pageLines of pages) {
    const page = doc.addPage([612, 792])
    let y = 750

    for (const line of pageLines) {
      if (y < margin) {
        break
      }

      if (line.startsWith('__TITLE__:')) {
        const title = line.replace('__TITLE__:', '')
        page.drawText(title, {
          x: margin,
          y,
          size: titleSize,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.4),
        })
        y -= titleSize + 6
      } else if (line.trim() === '') {
        y -= lineHeight / 2
      } else {
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        })
        y -= lineHeight
      }
    }
  }

  const pdfBytes = await doc.save()
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, pdfBytes)

  return outputPath
}
