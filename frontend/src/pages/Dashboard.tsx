import { useState } from 'react'
import toast from 'react-hot-toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useJobs, useJob, useCreateJob, useDeleteJob, useCvVersions, useGenerateCv, useUpdateCv, useUpdateJobStatus } from '../hooks/useJobs'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { Modal } from '../components/Modal'
import { runScrape, fetchLatestRun, cvDownloadUrl } from '../services/api'
import { Job, JobStatus, COLUMNS } from '../types'
const failure = (error: Error) => toast.error(error.message)
export function Dashboard() {
 const [adding, setAdding] = useState(false), [selected, setSelected] = useState('')
 const [query, setQuery] = useState(''), [includeExcluded, setExcluded] = useState(false)
 const { data: jobs = [], isLoading, error } = useJobs({ query: query || undefined, includeExcluded })
 const create = useCreateJob()
 const run = useQuery({ queryKey: ['latestRun'], queryFn: fetchLatestRun, refetchInterval: 3000 })
 const scrape = useMutation({ mutationFn: () => runScrape({}), onSuccess: () => { void run.refetch(); toast.success('Coleta iniciada') }, onError: failure })
 const running = ['queued','running'].includes(run.data?.status || '')
 const statusLabels: Record<string,string> = { queued: 'Na fila', running: 'Em andamento', completed: 'Concluída', partial: 'Concluída com falhas', failed: 'Falhou' }
 return <div className="h-full flex flex-col min-w-0">
  <header className="bg-white border-b px-4 py-4 space-y-3">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="text-xl font-bold">Suas candidaturas</h1><p className="text-sm text-gray-500">{jobs.length} vagas • candidaturas enviadas por você no site de origem</p></div>
    <div className="flex flex-wrap gap-2">
     <input aria-label="Buscar vagas" placeholder="Buscar vagas…" value={query} onChange={e => setQuery(e.target.value)} className="border rounded-lg p-2 w-48 max-w-full" />
     <button disabled={running || scrape.isPending} onClick={() => scrape.mutate()} className="btn-secondary">{running ? 'Coletando…' : 'Buscar Vagas'}</button>
     <button onClick={() => setAdding(true)} className="btn-primary">Nova Vaga</button>
    </div>
   </div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeExcluded} onChange={e => setExcluded(e.target.checked)} />Mostrar também vagas fora do filtro</label>
   {run.data && <details className="text-sm bg-gray-50 rounded p-2"><summary className="cursor-pointer">Última coleta: {statusLabels[run.data.status] || run.data.status} · {run.data.resultsCount} novas vagas</summary>
    <p>{new Date(run.data.createdAt).toLocaleString('pt-BR')}</p>
    <p className="whitespace-pre-wrap break-words text-red-700">{run.data.errorMessage}</p>
   </details>}
  </header>
  <div className="flex-1 min-h-0 overflow-auto py-5">
   {error ? <p role="alert" className="p-4 text-red-700">Não foi possível carregar as vagas: {error.message}</p>
    : isLoading ? <p className="p-4">Carregando vagas…</p> : <KanbanBoard jobs={jobs} onJobDetail={job => setSelected(job.id)} />}
  </div>
  {adding && <AddJob pending={create.isPending} onClose={() => setAdding(false)} onSubmit={data => create.mutate(data, { onSuccess: () => { setAdding(false); toast.success('Vaga adicionada') }, onError: failure })} />}
  {selected && <JobDetail id={selected} onClose={() => setSelected('')} />}
 </div>
}
function AddJob({ onSubmit, onClose, pending }: { onSubmit: (data: Partial<Job>) => void; onClose: () => void; pending: boolean }) {
 return <Modal title="Nova Vaga" onClose={onClose}><form className="space-y-4" onSubmit={e => {
  e.preventDefault(); const data = new FormData(e.currentTarget)
  onSubmit({ title: String(data.get('title')), company: String(data.get('company')), url: String(data.get('url')),
   description: String(data.get('description')), platform: data.get('platform') as Job['platform'],
   location: String(data.get('location')) || null, salary: String(data.get('salary')) || null })
 }}>
  {[['title','Título'],['company','Empresa'],['url','URL'],['location','Localização'],['salary','Salário']].map(([name,label]) =>
   <label key={name} className="block text-sm font-medium">{label}<input name={name} type={name === 'url' ? 'url' : 'text'} required={['title','company','url'].includes(name)} maxLength={name === 'url' ? 4000 : 500} className="block w-full p-2 border rounded-lg" /></label>)}
  <label className="block text-sm font-medium">Plataforma<select name="platform" defaultValue="manual" className="block w-full border rounded-lg p-2">{['manual','linkedin','indeed','gupy','glassdoor','nerdin','rss','api'].map(p => <option key={p}>{p}</option>)}</select></label>
  <label className="block text-sm font-medium">Descrição<textarea name="description" rows={5} maxLength={100000} className="block w-full border rounded-lg p-2" /></label>
  <div className="flex gap-2 justify-end"><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button disabled={pending} className="btn-primary">Adicionar Vaga</button></div>
 </form></Modal>
}
function JobDetail({ id, onClose }: { id: string; onClose: () => void }) {
 const { data: job, error } = useJob(id)
 const { data: versions = [] } = useCvVersions(id)
 const generate = useGenerateCv(), updateCv = useUpdateCv(), update = useUpdateJobStatus(), remove = useDeleteJob()
 const [versionId, setVersionId] = useState(''), [edited, setEdited] = useState<string | null>(null)
 const [description, setDescription] = useState<string | null>(null), [notes, setNotes] = useState<string | null>(null)
 const active = versions.find(v => v.id === versionId) || versions.find(v => v.id === job?.activeCvVersionId) || versions[0]
 const text = edited ?? active?.optimizedText ?? ''
 const close = () => { if ((edited !== null || description !== null || notes !== null) && !window.confirm('Descartar alterações não salvas?')) return; onClose() }
 if (error) return <Modal title="Vaga indisponível" onClose={onClose}><p role="alert">{error.message}</p></Modal>
 if (!job) return <Modal title="Carregando vaga…" onClose={onClose} />
 const generating = job.cvStatus === 'generating' || generate.isPending
 return <Modal title={job.title} onClose={close}>
  <p className="text-gray-600">{job.company} · {job.location || 'Localização não informada'}{job.salary ? ' · ' + job.salary : ''}</p>
  <label className="block text-sm font-medium">Etapa da candidatura<select aria-label="Etapa da candidatura" value={job.status} disabled={update.isPending} className="block w-full border rounded-lg p-2" onChange={e => update.mutate({ jobId:id, data: { status: e.target.value as JobStatus } }, { onError: failure })}>{COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
  {job.appliedAt && <p className="text-sm">Candidatura registrada em {new Date(job.appliedAt).toLocaleString('pt-BR')}</p>}
  {job.classificationReason && <p className="text-sm bg-amber-50 p-3 rounded">{job.classificationReason} · classificação: {job.classificationStatus}</p>}
  <label className="block text-sm font-medium">Descrição da vaga<textarea rows={5} value={description ?? job.description} onChange={e => setDescription(e.target.value)} className="block w-full p-2 border rounded-lg" /></label>
  <label className="block text-sm font-medium">Notas<textarea rows={2} value={notes ?? job.notes ?? ''} onChange={e => setNotes(e.target.value)} className="block w-full p-2 border rounded-lg" /></label>
  {(description !== null || notes !== null) && <button disabled={update.isPending} className="btn-primary" onClick={() => update.mutate({ jobId:id, data: { description: description ?? job.description, notes: notes ?? job.notes } }, { onSuccess: () => { setDescription(null); setNotes(null); toast.success('Vaga atualizada') }, onError: failure })}>Salvar dados da vaga</button>}
  <section className="border-t pt-4 space-y-3">
   <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Currículo para esta vaga</h3>
    <button disabled={generating || edited !== null || description !== null} className="btn-secondary" onClick={() => generate.mutate(id,{ onSuccess: () => { setVersionId(''); toast.success('Geração iniciada') }, onError: failure })}>{generating ? 'Gerando…' : 'Gerar nova versão'}</button></div>
   <p className="text-xs text-gray-600">Revise o conteúdo e o PDF antes de usar. A comparação abaixo mede palavras-chave e não prevê aprovação em ATS.</p>
   {job.cvError && <p role="alert" className="text-red-700">{job.cvError}</p>}
   {active && <>
    <label className="block text-sm">Versão do currículo<select aria-label="Versão do currículo" className="block w-full border rounded p-2" value={active.id} onChange={e => {
     if (edited !== null && !window.confirm('Descartar a edição não salva?')) return
     setEdited(null); setVersionId(e.target.value)
    }}>{versions.map((v,i) => <option key={v.id} value={v.id}>Versão {versions.length-i} · {new Date(v.createdAt).toLocaleString('pt-BR')} · {v.model}</option>)}</select></label>
    <details><summary className="cursor-pointer text-blue-700 text-sm">Comparar com o original</summary><pre className="whitespace-pre-wrap text-xs p-3 bg-gray-50 max-h-48 overflow-auto">{active.originalText}</pre></details>
    <label className="block text-sm font-medium">Texto do currículo<textarea rows={12} value={text} onChange={e => setEdited(e.target.value)} className="block w-full border rounded-lg p-3 font-mono text-sm" /></label>
    <p className="text-sm">Cobertura de palavras-chave: {active.atsReport.score}%</p>
    <p className="text-xs break-words">Encontradas: {active.atsReport.matchedKeywords.join(', ') || '—'}<br />Ausentes no texto: {active.atsReport.missingKeywords.join(', ') || '—'}</p>
    {active.atsReport.warnings.map(w => <p key={w} className="text-xs text-gray-600">{w}</p>)}
    <div className="flex flex-wrap gap-2"><button disabled={generating || updateCv.isPending || edited === null || !text.trim()} className="btn-primary" onClick={() => updateCv.mutate({ jobId:id, versionId:active.id, optimizedText:text }, { onSuccess: version => { setEdited(null); setVersionId(version.id); toast.success('Nova versão salva; histórico preservado') }, onError: failure })}>Salvar como nova versão</button>
     <a className="btn-secondary" href={cvDownloadUrl(id,active.id)}>Baixar PDF salvo</a></div>
    {edited !== null && <p className="text-xs text-amber-700">O download usa a versão salva. Salve suas alterações antes de baixar.</p>}
   </>}
  </section>
  <footer className="border-t pt-4 flex flex-wrap justify-between gap-2">
   <a className="btn-secondary" href={/^https?:\/\//i.test(job.url) ? job.url : undefined} target="_blank" rel="noopener noreferrer">Abrir vaga no site</a>
   <button className="text-red-700 px-3" disabled={remove.isPending || generating} onClick={() => { if (window.confirm('Remover esta vaga e seu histórico de currículos?')) remove.mutate(id,{ onSuccess:onClose,onError:failure }) }}>Remover vaga</button>
  </footer>
 </Modal>
}
