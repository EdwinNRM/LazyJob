import pdfParse from 'pdf-parse'

export async function parseCV(buffer: Buffer): Promise<string> {
  if (buffer.length === 0) {
    throw new Error('Buffer de currículo vazio')
  }

  const data = await pdfParse(buffer)
  const text = data.text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  return text
}
