import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, api, message, type AccessInput, type AccessRequest, type Client, type Collection, type Outcome } from './api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDemoProfile } from './DemoProfile'
import { Badge } from '@/components/ui/badge'
import ErrorNotice from './components/ErrorNotice'
import { useFormDraft } from './FormDrafts'
import { formatDate } from './lib/format'

type Mode = 'requester' | 'decider'

function Status({ value }: { value: AccessRequest['status'] }) {
  return <Badge variant="outline" className={value === 'ALLOWED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : value === 'DENIED' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}>{value}</Badge>
}

export default function App() {
  const { pathname, search } = useLocation()
  const leaf = pathname.split('/').filter(Boolean).slice(1)
  const listQuery = new URLSearchParams(search); listQuery.delete('tab')
  const listPath = '/access-requests' + (listQuery.size ? '?' + listQuery : '')
  const profile = useDemoProfile()
  const [mode, setMode] = useState<Mode>('requester')
  const [token, setToken] = useState('')
  const [draft, setDraft] = useState('')
  const [epoch, setEpoch] = useState(0)
  const [notice, setNotice] = useState('')
  function clear() { credentialSession.current++; setToken(''); setDraft(''); setEpoch(e => e + 1) }
  const credentialSession = useRef(0)
  const manualClient = useMemo(() => {
    const session = credentialSession.current
    return api(token, () => {
      if (session !== credentialSession.current) return
      clear(); setNotice('401 · Credential недействителен или истёк. Введите действующий token.')
    })
  }, [token])
  const client = profile.client ?? manualClient
  if (leaf.length > 1) return <section className="ux-panel ux-panel-body"><h1>Страница не найдена</h1><Link to="/">На главную</Link></section>
  return <>
    <nav className="ux-breadcrumbs" aria-label="Breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><Link to={listPath}>Заявки на доступ</Link>{leaf.length > 0 && <><span>/</span><span aria-current="page">{leaf[0] === 'new' ? 'Создание' : 'Карточка'}</span></>}</nav>
    {!profile.enabled && <>
        <section className="space-y-3 rounded-lg border bg-white p-4" aria-label="Demo credentials">
          <label className="text-sm font-medium" htmlFor="mode">Demo mode</label>
          <select id="mode" className="w-full rounded-md border p-2" value={mode} onChange={e => { clear(); setNotice(''); setMode(e.target.value as Mode) }}>
            <option value="requester">Requester</option><option value="decider">Decider</option>
          </select>
          <p className="text-xs text-slate-500">Режим отображения. Полномочия token проверяет сервер.</p>
          {!profile.enabled && <>{token ? <><p className="text-sm" role="status">Credential активен · {mode}</p><Button variant="outline" onClick={() => { clear(); setNotice('') }}>Очистить credential</Button></> :
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); credentialSession.current++; setToken(draft.trim()); setDraft(''); setNotice('') }}>
              <label className="text-sm" htmlFor="token">Bearer token</label>
              <Input id="token" type="password" value={draft} autoComplete="off" onChange={e => setDraft(e.target.value)} required />
              <Button type="submit" disabled={!draft.trim()}>Применить token</Button>
            </form>}</>}
          {!profile.enabled && <p className="text-xs text-slate-500">Credential хранится в памяти вкладки. После обновления или смены режима введите его снова.</p>}
        </section>
      </>}
      <div className="min-w-0 space-y-5">
        <ErrorNotice text={notice} />
        {!token && !profile.enabled ? <section className="panel"><h1>Введите демонстрационный credential</h1><p>Выберите режим и введите token из приватного локального файла.</p></section> :
          <div key={epoch + ':' + mode}><Routes>
            <Route index element={<RequestList client={client} />} />
            <Route path="new" element={<NewRequest client={client} />} />
            <Route path=":requestId" element={<RequestDetail client={client} mode={profile.enabled ? (profile.actor === 'decider' ? 'decider' : 'requester') : mode} />} />
            <Route path="*" element={<h1>Страница не найдена</h1>} />
          </Routes></div>}
      </div>
  </>
}

function RequestList({ client }: { client: Client }) {
  const profile = useDemoProfile()
  const restrictedDemo = profile.enabled && ['decider', 'exporter'].includes(profile.actor)
  const [params, setParams] = useSearchParams()
  const rawOffset = Number(params.get('offset') ?? 0)
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const setOffset = (value: number) => setParams(value ? {offset: String(value)} : {})
  const [page, setPage] = useState<Collection | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    setPage(null); setError('')
    client.list(offset).then(p => { if (active) setPage(p) }).catch(e => { if (active) setError(message(e)) })
    return () => { active = false }
  }, [client, offset, reload])
  return <section className="panel space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1>Заявки на доступ</h1><p>Заявки, доступные по серверным полномочиям.</p></div>{restrictedDemo ? <p>В стандартном демопрофиле заявки создаёт Requester. Переключите Demo actor.</p> : <Button asChild><Link to="/access-requests/new">Новая заявка</Link></Button>}</div>
    <ErrorNotice text={error} />
    {error && <Button variant="outline" onClick={() => setReload(x => x + 1)}>Повторить</Button>}
    {!page && !error && <p role="status">Загрузка заявок…</p>}
    {page && (page.items.length === 0 ? <p>Нет доступных заявок.</p> : <div className="overflow-x-auto"><table className="ux-table">
      <thead><tr>{['Заявка', 'Подана', 'Заявитель', 'Статус'].map(t => <th className="border-b px-2 py-3" key={t}>{t}</th>)}</tr></thead>
      <tbody>{page.items.map(r => <tr key={r.requestId}><td className="border-b px-2 py-4"><Link className="font-mono text-xs" to={'/access-requests/' + r.requestId + (offset ? '?offset=' + offset : '')}>{r.requestId}</Link></td><td className="border-b px-2 py-4">{formatDate(r.submittedAt)}</td><td className="border-b px-2 py-4 font-mono text-xs">{r.requesterActorId}</td><td className="border-b px-2 py-4"><Status value={r.status} /></td></tr>)}</tbody>
    </table></div>)}
    {page && <div className="flex items-center gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - page.limit))}>Назад</Button><span className="text-sm">Страница {Math.floor(offset / page.limit) + 1}</span><Button variant="outline" disabled={!page.hasMore} onClick={() => setOffset(offset + page.limit)}>Далее</Button></div>}
  </section>
}

const demo: AccessInput = {
  sourceDeploymentId: '00000000-0000-0000-0000-00000000000a',
  destinationDeploymentId: '00000000-0000-0000-0000-00000000000b',
  interactionRevisionId: '00000000-0000-0000-0000-000000000009',
  connectivityNeedId: '00000000-0000-0000-0000-00000000000d',
}
const emptyRequest: AccessInput = { sourceDeploymentId: '', destinationDeploymentId: '', interactionRevisionId: '', connectivityNeedId: '' }
const inputLabels: Record<keyof AccessInput, string> = { sourceDeploymentId: 'Исходное размещение', destinationDeploymentId: 'Целевое размещение', interactionRevisionId: 'Ревизия коммуникации', connectivityNeedId: 'Потребность' }
function NewRequest({ client }: { client: Client }) {
  const [data, setData, clearDraft] = useFormDraft('request', emptyRequest)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AccessInput, string>>>({})
  const profile = useDemoProfile()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const navigate = useNavigate()
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current) return
    const invalid = (Object.keys(data) as (keyof AccessInput)[]).filter(key => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data[key]))
    setFieldErrors(Object.fromEntries(invalid.map(key => [key, 'Введите полный UUID выбранного объекта.'])))
    if (invalid.length) { document.getElementById(invalid[0])?.focus(); return }
    submitting.current = true; setBusy(true); setError('')
    try { const r = await client.create(data); if (alive.current) { clearDraft(); navigate('/access-requests/' + r.requestId) } }
    catch (e) { if (alive.current) setError(message(e)) }
    finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  if (profile.enabled && ['decider', 'exporter'].includes(profile.actor)) return <section className="panel"><h1>Новая заявка</h1><p>В стандартном демопрофиле заявки создаёт Requester. Переключите Demo actor.</p><Link to="/access-requests">К заявкам</Link></section>
  return <section className="panel space-y-5"><div><h1>Новая заявка</h1><p>Пока доступна техническая форма по идентификаторам. Выбор из сохранённой потребности ещё не реализован. Допуск создаёт PENDING, а не разрешение.</p></div>
    <ErrorNotice text={error} />
    <Button variant="outline" disabled={busy} onClick={() => { setData(demo); setFieldErrors({}); setError('') }}>Заполнить demo-пример</Button>
    <p className="ux-note">Demo-пример относится к предустановленной потребности, а не к недавно созданному процессу.</p>
    <form className="process-form" noValidate onSubmit={submit}>
      {(Object.keys(demo) as (keyof AccessInput)[]).map(key => <div className="space-y-2" key={key}><label htmlFor={key}>{inputLabels[key]} <small>({key})</small></label><Input id={key} value={data[key]} onChange={e => { setData({ ...data, [key]: e.target.value }); setFieldErrors(errors => ({ ...errors, [key]: undefined })) }} required aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? key + '-error' : undefined} disabled={busy} />{fieldErrors[key] && <p role="alert" className="ux-field-error" id={key + '-error'}>{fieldErrors[key]}</p>}</div>)}
      <Button type="submit" disabled={busy}>{busy ? 'Создание…' : 'Создать заявку'}</Button>
      {!busy && <Link to="/access-requests" onClick={clearDraft}>Отмена</Link>}
    </form>
  </section>
}

function Evidence({ entries }: { entries: Record<string, string | null> }) {
  const labels: Record<string, string> = { requestId: 'Заявка', subjectId: 'Предмет доступа', requesterActorId: 'Заявитель', submittedAt: 'Подана', sourceResourceId: 'Исходный ресурс', grantId: 'Основание полномочий', checkedAt: 'Полномочия проверены', decisionId: 'Решение', outcome: 'Результат', deciderActorId: 'Решение принял', decidedAt: 'Решение принято', policyRuleId: 'Правило политики' }
  return <dl className="ux-properties">{Object.entries(entries).map(([k, v]) => <div key={k} data-field={k}><dt>{labels[k] ?? k}<small className="block">{k}</small></dt><dd className="mt-1 break-all font-mono text-xs">{v && ['submittedAt', 'checkedAt', 'decidedAt'].includes(k) ? <time dateTime={v} title={v}>{formatDate(v)}</time> : v ?? 'Не создано'}</dd></div>)}</dl>
}
function RequestDetail({ client, mode }: { client: Client; mode: Mode }) {
  const { requestId = '' } = useParams()
  const [params] = useSearchParams()
  const tabPath = (tab: string) => { const next = new URLSearchParams(params); next.set('tab', tab); return '?' + next }
  const decisionTab = params.get('tab') === 'decision'
  const [request, setRequest] = useState<AccessRequest | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [feedback, setFeedback] = useState('')
  const resultHeading = useRef<HTMLHeadingElement>(null), focusResult = useRef(false)
  useEffect(() => { setFeedback('') }, [requestId])
  useEffect(() => { if (request && focusResult.current) { resultHeading.current?.focus(); focusResult.current = false } }, [request])
  useEffect(() => {
    let active = true
    setRequest(null); setError('')
    client.request(requestId).then(r => { if (active) setRequest(r) }).catch(e => { if (active) setError(message(e)) })
    return () => { active = false }
  }, [client, requestId, reload])
  return <section className="panel space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 ref={resultHeading} tabIndex={-1} data-document-title={request ? `Заявка ${request.requestId.slice(0, 8)}` : undefined}>Заявка на доступ</h1><Button variant="outline" onClick={() => setReload(x => x + 1)}>Обновить статус</Button></div>
    <ErrorNotice text={error} />
    {!request && !error && <p role="status">Загрузка заявки…</p>}
    {feedback && <p role="status">{feedback}</p>}
    {request && request.requestId === requestId && <><Status value={request.status} /><nav className="ux-tabs" aria-label="Вкладки заявки"><Link to={tabPath('overview')} aria-current={!decisionTab ? 'page' : undefined}>Обзор</Link><Link to={tabPath('decision')} aria-current={decisionTab ? 'page' : undefined}>Решение и основания</Link></nav>{!decisionTab && <><Evidence entries={{ requestId: request.requestId, subjectId: request.subjectId, requesterActorId: request.requesterActorId, submittedAt: request.submittedAt }} />
      <h2>Основания допуска</h2><Evidence entries={request.admission} />
      </>}{decisionTab && <><h2>Решение сервера</h2>{request.decision ? <Evidence entries={request.decision} /> : <p>Решение ещё не принято.</p>}</>}
      {request.decision?.policyRuleId && <p className="ux-callout">Правило политики сохранено. REAL-карточка правила и экспорт пока доступны только через API с отдельными полномочиями. Раздел «Правила политики» содержит MOCK-данные. ALLOWED не подтверждает сетевую доступность.</p>}
      {mode === 'decider' && request.status === 'PENDING' && <DecisionPanel key={requestId} client={client} requestId={requestId} refresh={text => { focusResult.current = true; setFeedback(text); setReload(x => x + 1) }} />}
    </>}
  </section>
}

function DecisionPanel({ client, requestId, refresh }: { client: Client; requestId: string; refresh: (text: string) => void }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const alive = useRef(true)
  const confirmation = useRef<HTMLParagraphElement>(null), actions = useRef<HTMLElement>(null)
  const restoreAction = useRef<Outcome | null>(null)
  useLayoutEffect(() => {
    if (outcome) confirmation.current?.focus()
    else if (restoreAction.current) { actions.current?.querySelector<HTMLButtonElement>(`[data-outcome="${restoreAction.current}"]`)?.focus(); restoreAction.current = null }
  }, [outcome])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function confirm() {
    if (!outcome || submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try {
      await client.decide(requestId, outcome)
      if (alive.current) refresh('Решение сохранено.')
    } catch (e) {
      if (!alive.current) return
      if (e instanceof ApiError && e.status === 409) refresh(message(e))
      else setError(message(e))
    } finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section ref={actions} className="space-y-4 border-t pt-6" aria-label="Decision">
    <h2>Принять решение</h2><p className="text-sm text-slate-500">Сервер проверяет полномочия. Подтверждённое решение окончательно.</p>
    <ErrorNotice text={error} />
    {!outcome ? <div className="flex flex-wrap gap-3"><Button data-outcome="ALLOWED" onClick={() => setOutcome('ALLOWED')}>ALLOWED</Button><Button data-outcome="DENIED" variant="destructive" onClick={() => setOutcome('DENIED')}>DENIED</Button></div> :
      <div role="group" aria-label="Подтверждение решения" className="space-y-3 rounded-lg border bg-slate-50 p-4">
        <p ref={confirmation} tabIndex={-1}>Подтвердить {outcome} для заявки {requestId}? Изменить решение нельзя.</p>
        <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={confirm}>{busy ? 'Сохранение…' : `Подтвердить ${outcome}`}</Button><Button variant="outline" disabled={busy} onClick={() => { restoreAction.current = outcome; setOutcome(null); setError('') }}>Отмена</Button></div>
      </div>}
  </section>
}
