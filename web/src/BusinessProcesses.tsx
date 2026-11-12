import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, message, type BusinessProcess, type Client, type ProcessCollection } from './api'
import { Shell } from './prototype/Shell'

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 422) return 'Проверьте название и допустимую длину полей.'
  if (error instanceof ApiError && error.status === 404) return 'Бизнес-процесс не найден.'
  return message(error)
}
function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  return error && <div><p role="alert">{error}</p>{retry && <button onClick={retry}>Повторить</button>}</div>
}
export default function BusinessProcesses() {
  const [token, setToken] = useState(''), [draft, setDraft] = useState(''), [notice, setNotice] = useState('')
  const client = useMemo(() => api(token, () => { setToken(''); setDraft(''); setNotice('Credential expired or invalid. Enter a valid token again.') }), [token])
  return <Shell section="processes" real>
    <nav className="ux-breadcrumbs" aria-label="Breadcrumbs"><Link to="/prototype">NAPMS</Link><span>/</span><Link to="/business-processes">Бизнес-процессы</Link></nav>
    <section className="ux-panel ux-panel-body" aria-label="Demo credentials">
      <strong>REAL · локальный демонстрационный каталог</strong>
      <p>Сервер проверяет отдельные права чтения и создания. Ответственная организация — описание, не полномочие.</p>
      <ErrorNotice error={notice} />
      {token ? <><p role="status">Credential active</p><button onClick={() => { setToken(''); setDraft(''); setNotice('') }}>Clear credential</button></> : <form onSubmit={e => { e.preventDefault(); setToken(draft.trim()); setDraft(''); setNotice('') }}>
        <label htmlFor="process-token">Bearer token</label><input id="process-token" type="password" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)} required />
        <button disabled={!draft.trim()}>Use token</button>
      </form>}
      <p>Credential хранится только в памяти вкладки. После обновления страницы введите его снова.</p>
    </section>
    {!token ? <p>Введите локальный credential из приватного файла сервера.</p> : <Routes>
      <Route index element={<ProcessList client={client} />} />
      <Route path="new" element={<NewProcess client={client} />} />
      <Route path=":processId" element={<ProcessDetail client={client} />} />
    </Routes>}
    <p className="ux-note">Эта коллекция использует FastAPI и SQLite. <Link to="/prototype/processes">MOCK Simulation: учебный сценарий процесса → потребности → заявки</Link>. Остальные коллекции Sidebar пока MOCK.</p>
  </Shell>
}
function ProcessList({ client }: { client: Client }) {
  const [page, setPage] = useState<ProcessCollection | null>(null), [error, setError] = useState('')
  const [offset, setOffset] = useState(0), [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true; setPage(null); setError('')
    client.processes(offset).then(p => { if (active) setPage(p) }).catch(e => { if (active) setError(errorMessage(e)) })
    return () => { active = false }
  }, [client, offset, reload])
  return <><div className="ux-heading"><p className="ux-eyebrow">BusinessProcess · REAL</p><h1>Бизнес-процессы</h1><Link to="/business-processes/new">Создать бизнес-процесс</Link></div>
    <section className="ux-panel ux-panel-body"><ErrorNotice error={error} retry={() => setReload(x => x + 1)} />
      {!page && !error && <p role="status">Загрузка…</p>}
      {page && <>{page.items.length ? <table className="ux-table"><thead><tr><th>Название</th><th>Ответственная организация</th></tr></thead><tbody>{page.items.map(p => <tr key={p.processId}><td><Link to={'/business-processes/' + p.processId}>{p.name ?? 'Название не указано'}</Link></td><td>{p.responsibleOrganization ?? 'Не указана'}</td></tr>)}</tbody></table> : <p>На этой странице нет бизнес-процессов.</p>}
        <div><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - page.limit))}>Назад</button><span> Страница {offset / page.limit + 1} </span><button disabled={!page.hasMore} onClick={() => setOffset(offset + page.limit)}>Далее</button></div></>}
    </section></>
}
function NewProcess({ client }: { client: Client }) {
  const [name, setName] = useState(''), [description, setDescription] = useState(''), [organization, setOrganization] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const submitting = useRef(false), alive = useRef(true), navigate = useNavigate()
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function submit(e: FormEvent) {
    e.preventDefault(); if (submitting.current) return
    if (!name.trim()) { setError('Укажите непустое название.'); return }
    submitting.current = true; setBusy(true); setError('')
    try {
      const item = await client.createProcess({ name, description: description || null, responsibleOrganization: organization || null })
      if (alive.current) navigate('/business-processes/' + item.processId)
    } catch (e) { if (alive.current) setError(errorMessage(e)) }
    finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="ux-panel ux-panel-body"><h1>Создать бизнес-процесс</h1><ErrorNotice error={error} />
    <form className="process-form" onSubmit={submit}><label htmlFor="process-name">Название</label><input id="process-name" required maxLength={300} value={name} disabled={busy} onChange={e => setName(e.target.value)} />
      <label htmlFor="process-description">Описание</label><textarea id="process-description" maxLength={10000} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} />
      <label htmlFor="process-organization">Ответственная организация</label><input id="process-organization" maxLength={300} value={organization} disabled={busy} onChange={e => setOrganization(e.target.value)} />
      <button disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</button><Link to="/business-processes">Отмена</Link>
    </form></section>
}
function ProcessDetail({ client }: { client: Client }) {
  const { processId = '' } = useParams()
  const [item, setItem] = useState<BusinessProcess | null>(null), [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true; setItem(null); setError('')
    client.process(processId).then(p => { if (active) setItem(p) }).catch(e => { if (active) setError(errorMessage(e)) })
    return () => { active = false }
  }, [client, processId, reload])
  return <section className="ux-panel ux-panel-body"><ErrorNotice error={error} retry={() => setReload(x => x + 1)} />
    {!item && !error && <p role="status">Загрузка…</p>}
    {item && item.processId === processId && <><p className="ux-eyebrow">BusinessProcess · REAL · Обзор</p><h1>{item.name ?? 'Название не указано'}</h1><dl>
      <dt>Идентификатор</dt><dd>{item.processId}</dd><dt>Описание</dt><dd>{item.description ?? 'Не указано'}</dd><dt>Ответственная организация</dt><dd>{item.responsibleOrganization ?? 'Не указана'}</dd>
    </dl><h2>Потребности</h2><p>Серверное чтение потребностей ещё не подключено.</p></>}
  </section>
}
