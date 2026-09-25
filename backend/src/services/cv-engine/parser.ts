import pdfParse from 'pdf-parse'
export async function parseCV(buffer: Buffer): Promise<string> {
 if (!buffer.length) throw new Error('Buffer de currículo vazio')
 if (buffer.length > 15 * 1024 * 1024) throw new Error('O PDF deve ter até 15 MB')
 const data = await pdfParse(buffer)
 const text = data.text.replace(/[^\S\n]+/g, ' ').replace(/\n[ \t]*\n+/g, '\n\n').trim()
 if (!text) throw new Error('PDF sem texto selecionável. Cole o texto revisado nas configurações; OCR não está incluído.')
 return text
}
