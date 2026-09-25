import { XMLParser, XMLValidator } from 'fast-xml-parser'
export interface FeedJob { title: string; company: string; platform: 'rss'|'api'; url: string; description: string; location?: string; publishedAt?: string }
function text(value: unknown): string { return typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim() : '' }
function safeUrl(value: unknown): string { const s = text(value); try { return /^https?:$/.test(new URL(s).protocol) ? s : '' } catch { return '' } }
function date(value: unknown) { const s = text(value); return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : undefined }
async function fetchData(url: string) {
 if (!safeUrl(url)) throw new Error('URL deve usar HTTP ou HTTPS')
 const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
 if (!response.ok) throw new Error('HTTP ' + response.status)
 return response
}
export async function scrapeRss(urls: string[]): Promise<FeedJob[]> {
 const jobs: FeedJob[] = []
 for (const url of urls) {
  const xml = await (await fetchData(url)).text()
  if (XMLValidator.validate(xml) !== true) throw new Error('RSS inválido')
  const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml)
  if (!parsed.rss?.channel && !parsed.feed) throw new Error('Formato não é RSS nem Atom')
  const raw = parsed.rss?.channel?.item || parsed.feed?.entry || []
  for (const item of Array.isArray(raw) ? raw : [raw]) {
   const links = Array.isArray(item.link) ? item.link : [item.link]
   const link = links.find((l: any) => typeof l === 'string' || !l?.['@_rel'] || l['@_rel'] === 'alternate')
   const jobUrl = safeUrl(typeof link === 'string' ? link : link?.['@_href']) || safeUrl(item.guid)
   const title = text(item.title?.['#text'] || item.title)
   if (title && jobUrl) jobs.push({ title, company: text(item.author?.name || item.author || item['dc:creator']) || 'Não informada',
    platform: 'rss', url: jobUrl, description: text(item['content:encoded'] || item.description || item.content?.['#text'] || item.summary),
    location: text(item.location) || undefined, publishedAt: date(item.pubDate || item.published || item.updated) })
  }
 }
 return jobs
}
export async function scrapeJsonApis(urls: string[]): Promise<FeedJob[]> {
 const jobs: FeedJob[] = []
 for (const url of urls) {
  const payload: any = await (await fetchData(url)).json()
  const items = Array.isArray(payload) ? payload : payload?.jobs || payload?.data
  if (!Array.isArray(items)) throw new Error('API deve retornar uma lista ou um objeto com jobs/data')
  for (const item of items) {
   if (!item || typeof item !== 'object') continue
   const title = text(item.title || item.position || item.name)
   const link = safeUrl(item.url || item.link || item.apply_url)
   if (title && link) jobs.push({ title, company: text(item.company_name || item.company?.name || item.company) || 'Não informada',
    platform: 'api', url: link, description: text(item.description || item.description_text),
    location: text(item.location || item.candidate_required_location) || (item.remote === true ? 'Remote' : undefined),
    publishedAt: date(item.published_at || item.created_at) })
  }
 }
 return jobs
}
