import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useSettings } from '../hooks/useSettings'
import { fetchBaseCvText, saveSettings } from '../services/api'
const defaults: Record<string,string> = {
 cvBasePath: '', cvBaseText: '', llmProvider: 'none', llmModel: '', llmBaseUrl: '', llmApiKey: '',
 searchQueries: '["desenvolvedor de software"]', searchLocations: '["Remoto Brasil"]',
 enabledSources: '["nerdin"]', rssUrls: '[]', publicApiUrls: '[]',
}
export function Settings() {
 const { data, isLoading, error } = useSettings()
 const client = useQueryClient()
 const [form, setForm] = useState<Record<string,string> | null>(null)
 const [busy, setBusy] = useState(false)
 useEffect(() => { if (data && !form) setForm(Object.fromEntries(Object.entries(defaults).map(([key,value]) => [key, data[key] ?? value]))) }, [data, form])
 if (isLoading) return <p className="p-6">Carregando configurações…</p>
 if (error) return <p role="alert" className="p-6 text-red-700">Não foi possível conectar ao servidor: {error.message}</p>
 if (!form) return null
 const change = (key: string, value: string) => setForm({ ...form, [key]: value })
 const save = async () => {
  await saveSettings(form)
  await client.invalidateQueries({ queryKey: ['settings'] })
 }
 const field = (key: string, label: string, rows?: number) => <label key={key} className="block text-sm font-medium space-y-1">{label}
  {rows ? <textarea rows={rows} value={form[key] || ''} onChange={e => change(key,e.target.value)} className="block w-full border rounded-lg p-3 font-mono text-sm" />
   : <input type={key === 'llmApiKey' ? 'password' : 'text'} value={form[key] || ''} onChange={e => change(key,e.target.value)} className="block w-full border rounded-lg p-3" />}
 </label>
 return <form className="max-w-3xl mx-auto py-8 px-4 space-y-6" onSubmit={async e => {
  e.preventDefault(); setBusy(true)
  try { await save(); toast.success('Configurações salvas') } catch (error) { toast.error(String(error)) } finally { setBusy(false) }
 }}>
  <h1 className="text-2xl font-bold">Configurações</h1>
  <section className="bg-white border rounded-xl p-5 space-y-4">
   <h2 className="text-lg font-semibold">Currículo-base</h2>
   <p className="text-sm text-gray-600">Cole o texto revisado ou extraia de um PDF local. O texto revisado tem prioridade sobre o arquivo.</p>
   {field('cvBasePath','Caminho absoluto do PDF (opcional)')}
   <button type="button" disabled={busy || !form.cvBasePath} className="btn-secondary" onClick={async () => {
    if (form.cvBaseText && !window.confirm('Substituir o texto em edição pela extração do PDF?')) return
    setBusy(true)
    try { await save(); const result = await fetchBaseCvText(); change('cvBaseText',result.text); toast.success('Texto extraído. Revise e salve.') }
    catch (error) { toast.error(String(error)) } finally { setBusy(false) }
   }}>Extrair do PDF</button>
   {field('cvBaseText','Texto revisado do currículo',12)}
  </section>
  <section className="bg-white border rounded-xl p-5 space-y-4">
   <h2 className="text-lg font-semibold">IA opcional</h2>
   <p className="text-sm text-gray-600">Sem IA, o conteúdo é preservado e convertido em PDF. Com IA, apenas a ordem das seções pode mudar; os fatos são preservados. Provedores externos recebem o texto do currículo e a descrição da vaga.</p>
   <label className="block text-sm font-medium">Provedor
    <select aria-label="Provedor" className="block w-full border rounded-lg p-3" value={form.llmProvider} onChange={e => {
     const provider = e.target.value
     setForm({ ...form, llmProvider: provider, llmModel: provider === 'ollama' ? 'qwen3:8b' : '', llmBaseUrl: provider === 'ollama' ? 'http://localhost:11434' : '', llmApiKey: '' })
    }}><option value="none">Sem IA (texto original)</option><option value="ollama">Ollama (local)</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select>
   </label>
   {form.llmProvider !== 'none' && <>{field('llmModel','Modelo')}{field('llmBaseUrl','URL base (vazia usa o padrão do provedor)')}{field('llmApiKey','Chave de API (somente provedores externos)')}</>}
  </section>
  <section className="bg-white border rounded-xl p-5 space-y-4">
   <h2 className="text-lg font-semibold">Busca de vagas</h2>
   <p className="text-sm text-gray-600">Use listas JSON, por exemplo: ["Python", "React"]. Coletas agendadas às 06h e 18h, horário de Brasília, enquanto o servidor estiver aberto.</p>
   {field('searchQueries','Termos de busca (JSON)',2)}{field('searchLocations','Localizações (JSON)',2)}
   {field('enabledSources','Fontes habilitadas (JSON)',2)}
   <p className="text-xs text-gray-600">Fontes: linkedin, indeed, gupy, glassdoor, nerdin, rss, api. Sites podem exigir login ou bloquear coleta. RSS e API só consultam as URLs configuradas abaixo.</p>
   {field('rssUrls','Feeds RSS/Atom (JSON)',2)}{field('publicApiUrls','APIs públicas JSON (JSON)',2)}
  </section>
  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Salvando…' : 'Salvar configurações'}</button>
 </form>
}
