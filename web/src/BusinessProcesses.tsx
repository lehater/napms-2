import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, message, type BusinessProcess, type Client, type ProcessCollection } from './api'
import Needs from './Needs'
import { useDemoProfile } from './DemoProfile'
import { Button } from './components/ui/button'
import { CollectionView } from './components/real/CollectionView'
import { DetailView } from './components/real/DetailView'
import { useFormDraft } from './FormDrafts'

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 422) return 'Проверьте название и допустимую длину полей.'
  if (error instanceof ApiError && error.status === 404) return 'Бизнес-процесс не найден.'
  return message(error)
}
function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  return error && <div><p role="alert">{error}</p>{retry && <Button variant="outline" onClick={retry}>Повторить</Button>}</div>
}
export default function BusinessProcesses() {
  const { pathname, search } = useLocation()
  const leaf = pathname.split('/').filter(Boolean).slice(1)
  const listQuery = new URLSearchParams(search); listQuery.delete('tab')
  const listPath = '/business-processes' + (listQuery.size ? '?' + listQuery : '')
  const profile = useDemoProfile()
  const [token, setToken] = useState(''), [draft, setDraft] = useState(''), [notice, setNotice] = useState('')
  const credentialSession = useRef(0)
  const manualClient = useMemo(() => {
    const session = credentialSession.current
    return api(token, () => {
      if (session !== credentialSession.current) return
      credentialSession.current++; setToken(''); setDraft(''); setNotice('401 · Credential недействителен или истёк. Введите действующий token.')
    })
  }, [token])
  const client = profile.client ?? manualClient
  if (leaf.length > 1) return <section className="ux-panel ux-panel-body"><h1>Страница не найдена</h1><Link to="/">На главную</Link></section>
  return <>
    {(leaf.length === 0 || leaf[0] === 'new') && <nav className="ux-breadcrumbs" aria-label="Breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><Link to={listPath}>Бизнес-процессы</Link>{leaf.length > 0 && <><span>/</span><span aria-current="page">Создание</span></>}</nav>}
    {!profile.enabled && <section className="ux-panel ux-panel-body" aria-label="Demo credentials">
      <strong>Локальный демонстрационный каталог</strong>
      <p>Сервер проверяет отдельные права чтения и создания. Ответственная организация — описание, не полномочие.</p>
      <ErrorNotice error={notice} />
      {token ? <><p role="status">Credential активен</p><Button variant="outline" onClick={() => { credentialSession.current++; setToken(''); setDraft(''); setNotice('') }}>Очистить credential</Button></> : <form onSubmit={e => { e.preventDefault(); credentialSession.current++; setToken(draft.trim()); setDraft(''); setNotice('') }}>
        <label htmlFor="process-token">Bearer token</label><input id="process-token" type="password" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)} required />
        <Button disabled={!draft.trim()}>Применить token</Button>
      </form>}
      <p>Credential хранится только в памяти вкладки. После обновления страницы введите его снова.</p>
    </section>}
    {!token && !profile.enabled ? <p>Введите локальный credential из приватного файла сервера.</p> : <div key={token}><Routes>
      <Route index element={<ProcessList client={client} />} />
      <Route path="new" element={<NewProcess client={client} />} />
      <Route path=":processId" element={<ProcessDetail client={client} />} />
      <Route path="*" element={<h1>Страница не найдена</h1>} />
    </Routes></div>}
  </>
}
function ProcessList({ client }: { client: Client }) {
  const [page, setPage] = useState<ProcessCollection | null>(null), [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const rawOffset = Number(params.get('offset') ?? 0)
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const setOffset = (value: number) => setParams(value ? {offset: String(value)} : {})
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true; setPage(null); setError('')
    client.processes(offset).then(p => { if (active) setPage(p) }).catch(e => { if (active) setError(errorMessage(e)) })
    return () => { active = false }
  }, [client, offset, reload])
  return <CollectionView<BusinessProcess> title="Бизнес-процессы" actions={<Button asChild><Link to="/business-processes/new">Создать бизнес-процесс</Link></Button>}
    rows={page?.items ?? []} columns={[
      {key:'name',title:'Название',render:p=><Link to={'/business-processes/' + p.processId + (offset ? '?offset=' + offset : '')}>{p.name ?? 'Название не задано'}</Link>},
      {key:'organization',title:'Ответственная организация',render:p=>p.responsibleOrganization ?? 'Не указана'},
    ]} getKey={p=>p.processId} emptyText="На этой странице нет бизнес-процессов" loading={!page && !error} error={error} offset={offset} limit={page?.limit ?? 20} hasMore={page?.hasMore} onPrevious={()=>setOffset(Math.max(0,offset-(page?.limit ?? 20)))} onNext={()=>setOffset(offset+(page?.limit ?? 20))} onRefresh={()=>setReload(x=>x+1)} />
}
function NewProcess({ client }: { client: Client }) {
  const [{ name, description, organization }, setDraft, clearDraft] = useFormDraft('process', { name: '', description: '', organization: '' })
  const profile = useDemoProfile()
  const [nameError, setNameError] = useState('')
  const nameInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const submitting = useRef(false), alive = useRef(true), navigate = useNavigate()
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function submit(e: FormEvent) {
    e.preventDefault(); if (submitting.current) return
    if (!name.trim()) { setNameError('Укажите непустое название.'); nameInput.current?.focus(); return }
    submitting.current = true; setBusy(true); setError('')
    try {
      const item = await client.createProcess({ name, description: description || null, responsibleOrganization: organization || null })
      if (alive.current) { clearDraft(); navigate('/business-processes/' + item.processId) }
    } catch (e) { if (alive.current) setError(errorMessage(e)) }
    finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="ux-panel ux-panel-body"><h1>Создать бизнес-процесс</h1><ErrorNotice error={error} />
    <form className="process-form" onSubmit={submit}><label htmlFor="process-name">Название</label><input ref={nameInput} id="process-name" required maxLength={300} value={name} disabled={busy} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'process-name-error' : undefined} onChange={e => { setDraft(d => ({ ...d, name: e.target.value })); setNameError('') }} />
      {nameError && <p id="process-name-error" role="alert" className="ux-field-error">{nameError}</p>}
      <label htmlFor="process-description">Описание</label><textarea id="process-description" maxLength={10000} value={description} disabled={busy} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
      <label htmlFor="process-organization">Ответственная организация</label><input id="process-organization" maxLength={300} value={organization} disabled={busy} onChange={e => setDraft(d => ({ ...d, organization: e.target.value }))} />
      <Button disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</Button><Link to="/business-processes" onClick={clearDraft}>Отмена</Link>
    </form><p className="ux-note">{profile.enabled ? 'Черновик сохраняется при переходах в этой вкладке до сохранения, отмены или смены Demo actor. Перезагрузка очистит его.' : 'Черновик хранится только в форме и удаляется при отмене или очистке credential.'}</p></section>
}
function ProcessDetail({ client }: { client: Client }) {
  const { processId = '' } = useParams()
  const [params] = useSearchParams()
  const tabPath = (tab: string) => { const next = new URLSearchParams(params); next.set('tab', tab); return '?' + next }
  const needs = params.get('tab') === 'needs'
  const [item, setItem] = useState<BusinessProcess | null>(null), [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true; setItem(null); setError('')
    client.process(processId).then(p => { if (active) setItem(p) }).catch(e => { if (active) setError(errorMessage(e)) })
    return () => { active = false }
  }, [client, processId, reload])
  if (!item || item.processId !== processId) return <section className="ux-panel ux-panel-body"><ErrorNotice error={error} retry={() => setReload(x => x + 1)} />{!error && <p role="status">Загрузка…</p>}</section>
  return <DetailView breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to={'/business-processes' + (params.has('offset') ? '?offset=' + params.get('offset') : '')}>Бизнес-процессы</Link><span>/</span><span aria-current="page">{item.name ?? 'Название не задано'}</span></>}
    title={item.name ?? 'Название не задано'}
    tabs={[{id:'overview',label:'Обзор',href:tabPath('overview')},{id:'needs',label:'Потребности',href:tabPath('needs')}]} activeTab={needs ? 'needs' : 'overview'}>
    {!needs ? <dl className="ux-properties">{Object.entries({'Идентификатор': item.processId, 'Название': item.name ?? 'Название не задано', 'Описание': item.description ?? 'Не указано', 'Ответственная организация': item.responsibleOrganization ?? 'Не указана'}).map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : <Needs key={processId} client={client} processId={processId} />}
  </DetailView>
}
