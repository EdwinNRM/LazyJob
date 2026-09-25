import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { createServer, type Server } from 'http'
import { createApp } from '../index'
import { generateCvVersion, updateCvVersion } from './cv-engine/workflow'
import { scrapeAllPlatforms } from './scraper'
import { parseCV } from './cv-engine/parser'
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lazyjob-integration-'))
const database = 'file:' + path.join(temp, 'test.db').replace(/\\/g, '/')
const prisma = new PrismaClient({ datasourceUrl: database })
const app = createApp(prisma)
const jobData = { title: 'Desenvolvedor Python', company: 'Empresa fictícia', platform: 'manual', url: 'https://example.com/jobs/test', description: 'Python React C# Java', location: 'Remoto Brasil' }
const source = 'ANA EXEMPLO\nana@example.com\n\nEXPERIÊNCIA\nDesenvolvedora Python — Empresa Exemplo, 2022–2025\n\nHABILIDADES\nPython, C#, .NET e React'
const api = { get: (url: string) => request(app).get(url).set('Host','localhost'), post: (url: string) => request(app).post(url).set('Host','localhost'), patch: (url: string) => request(app).patch(url).set('Host','localhost'), put: (url: string) => request(app).put(url).set('Host','localhost'), delete: (url: string) => request(app).delete(url).set('Host','localhost') }
let feed: Server, feedUrl: string
beforeAll(async () => {
 execFileSync(process.execPath, [path.resolve('scripts/db.cjs'), 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: database }, stdio: 'pipe' })
 process.env.CV_OUTPUT_DIR = path.join(temp, 'cvs')
 feed = createServer((req, res) => {
  if (req.url === '/broken') { res.writeHead(503); res.end('Unavailable'); return }
  if (req.url === '/rss') { res.setHeader('Content-Type','application/xml'); res.end('<rss version="2.0"><channel><item><title>Analista Python</title><link>https://example.com/rss</link><description><![CDATA[Remoto Brasil Python]]></description><pubDate>bad date</pubDate></item></channel></rss>'); return }
  res.setHeader('Content-Type','application/json')
  res.end(JSON.stringify({ jobs: [{ title:'Python Developer', company:{name:'Feed Company'}, url:'https://example.com/feed?utm_source=test', description:'Python remote worldwide', published_at:'invalid date' }, { title:'Invalid URL',url:'javascript:alert(1)' }] }))
 })
 await new Promise<void>(resolve => feed.listen(0,'127.0.0.1',resolve))
 feedUrl = 'http://127.0.0.1:' + (feed.address() as {port:number}).port
}, 30000)
beforeEach(async () => { await prisma.job.deleteMany(); await prisma.setting.deleteMany(); await prisma.scrapeRun.deleteMany(); await prisma.scrapeLog.deleteMany() })
afterAll(async () => { await prisma.$disconnect(); if (feed) await new Promise<void>(resolve => feed.close(() => resolve())); delete process.env.CV_OUTPUT_DIR; fs.rmSync(temp,{recursive:true,force:true}) })
async function job() { return (await api.post('/api/jobs').send(jobData).expect(201)).body }
async function setting(key: string, value: string) { await api.put('/api/settings/' + key).send({value}).expect(200) }
describe('API e SQLite reais', () => {
 it('seed é idempotente e preserva configurações existentes', async () => {
  await setting('llmProvider','none'); await setting('searchQueries','["consulta personalizada"]')
  for (let i=0;i<2;i++) execFileSync(process.execPath,[require.resolve('tsx/cli'),'scripts/seed-defaults.ts'],{env:{...process.env,DATABASE_URL:database},stdio:'pipe'})
  expect((await api.get('/api/settings')).body.searchQueries).toBe('["consulta personalizada"]')
  expect((await api.get('/api/settings')).body.llmProvider).toBe('none')
 },15000)

 it('persiste, pesquisa e impede URL duplicada ou executável', async () => {
  const created = await job()
  await api.post('/api/jobs').send(jobData).expect(409)
  await api.post('/api/jobs').send({...jobData,url:'javascript:alert(1)'}).expect(400)
  expect((await api.get('/api/jobs?query=Python')).body[0].id).toBe(created.id)
  expect((await api.get('/api/jobs?query=absent')).body).toHaveLength(0)
 })
 it('preserva data da candidatura e limpa ao reverter', async () => {
  const created = await job()
  const a = await api.patch('/api/jobs/'+created.id).send({status:'applied'}).expect(200)
  const b = await api.patch('/api/jobs/'+created.id).send({status:'applied'}).expect(200)
  expect(b.body.appliedAt).toBe(a.body.appliedAt)
  expect((await api.patch('/api/jobs/'+created.id).send({status:'analyzing'})).body.appliedAt).toBeNull()
  await api.patch('/api/jobs/'+created.id).send({cvPath:'C:/secret'}).expect(400)
 })
 it('recusa configurações inválidas atomicamente e permite limpar texto', async () => {
  await setting('cvBaseText',source)
  await api.put('/api/settings').send({cvBaseText:'changed', searchQueries:'{}'}).expect(400)
  expect((await api.get('/api/settings')).body.cvBaseText).toBe(source)
  await setting('cvBaseText','')
  await api.put('/api/settings/rssUrls').send({value:'["file:///etc/passwd"]'}).expect(400)
 })
 it('recusa chamadas de sites externos e hosts não locais', async () => {
  await api.post('/api/jobs').set('Origin','https://untrusted.example').send(jobData).expect(403)
  await request(app).get('/api/settings').set('Host','evil.example').expect(403)
  await api.get('/api/health').expect(200)
 })
 it('registra erro de currículo ausente em vez de ficar aguardando', async () => {
  const created = await job()
  await expect(generateCvVersion(prisma,created.id)).rejects.toThrow()
  expect((await prisma.job.findUniqueOrThrow({where:{id:created.id}})).cvStatus).toBe('error')
 })
 it('gera sem PDF-base, mantém fatos, baixa e salva histórico imutável', async () => {
  const created = await job(); await setting('cvBaseText',source)
  const first = await generateCvVersion(prisma,created.id)
  expect(first.optimizedText).toBe(source)
  const extracted = await parseCV(fs.readFileSync(first.pdfPath))
  expect(extracted).toContain('ana@example.com'); expect(extracted).toContain('C#')
  const oldBytes = fs.readFileSync(first.pdfPath)
  const edited = source + '\nIDIOMAS\nPortuguês'
  const second = await updateCvVersion(prisma,created.id,first.id,edited)
  expect(second.id).not.toBe(first.id)
  expect(fs.readFileSync(first.pdfPath)).toEqual(oldBytes)
  expect((await api.get('/api/jobs/'+created.id+'/cv')).body).toHaveLength(2)
  await api.get('/api/jobs/'+created.id+'/cv/'+second.id+'/download').expect(200).expect('Content-Type',/pdf/)
  expect((await prisma.job.findUniqueOrThrow({where:{id:created.id}})).activeCvVersionId).toBe(second.id)
 })
 it('impede geração concorrente para a mesma vaga', async () => {
  const created = await job(); await setting('cvBaseText',source)
  const first = generateCvVersion(prisma,created.id)
  await expect(generateCvVersion(prisma,created.id)).rejects.toThrow('andamento')
  await first
  expect(await prisma.cvVersion.count()).toBe(1)
 })
 it('rejeita edição vazia e versão que pertence a outra vaga', async () => {
  const created = await job()
  await api.put('/api/jobs/'+created.id+'/cv/not-found').send({optimizedText:{}}).expect(400)
  await api.put('/api/jobs/'+created.id+'/cv/not-found').send({optimizedText:' '}).expect(400)
  await api.put('/api/jobs/'+created.id+'/cv/not-found').send({optimizedText:'Valid text'}).expect(404)
 })
 it('exclusão remove versões relacionadas e retorna 404 se inexistente', async () => {
  const created = await job(); await setting('cvBaseText',source); await generateCvVersion(prisma,created.id)
  await api.delete('/api/jobs/'+created.id).expect(204)
  expect(await prisma.cvVersion.count()).toBe(0)
  await api.delete('/api/jobs/'+created.id).expect(404)
 })
 it('importa API/RSS com deduplicação, datas inválidas e falha isolada', async () => {
  await setting('publicApiUrls',JSON.stringify([feedUrl+'/broken',feedUrl+'/jobs']))
  await setting('rssUrls',JSON.stringify([feedUrl+'/rss']))
  const results = await scrapeAllPlatforms({queries:['Python'],platforms:['api','rss'],prisma})
  expect(results).toHaveLength(2)
  expect(await prisma.job.count()).toBe(2)
  expect(await prisma.scrapeLog.count({where:{success:false}})).toBe(1)
  expect((await scrapeAllPlatforms({queries:['Python'],platforms:['api','rss'],prisma}))).toHaveLength(0)
  expect((await prisma.job.findFirstOrThrow({where:{platform:'api'}})).company).toBe('Feed Company')
 })
 it('reclassificar não altera etapas nem candidaturas registradas', async () => {
  const created = await prisma.job.create({data:{...jobData,platform:'api',status:'applied',classificationStatus:'excluded',description:'Presencial'}})
  await api.post('/api/scrape/reclassify').send({}).expect(200)
  expect((await prisma.job.findUniqueOrThrow({where:{id:created.id}})).status).toBe('applied')
  expect((await api.get('/api/jobs')).body).toHaveLength(1)
 })
 it('coleta informa resultado parcial e rejeita parâmetros inválidos', async () => {
  await setting('publicApiUrls',JSON.stringify([feedUrl+'/broken',feedUrl+'/jobs']))
  await api.post('/api/scrape/run').send({queries:[]}).expect(400)
  const response = await api.post('/api/scrape/run').send({queries:['Python'],platforms:['api']}).expect(202)
  await expect.poll(async () => (await api.get('/api/scrape/runs/'+response.body.runId)).body.status).toBe('partial')
  const latest = (await api.get('/api/scrape/runs/latest')).body
  expect(latest.resultsCount).toBe(1); expect(latest.errorMessage).toContain('503')
 })
})
