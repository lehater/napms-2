import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, api, message, type AccessRequest, type Client, type Collection, type Outcome } from './api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDemoProfile } from './DemoProfile'
import { Badge } from '@/components/ui/badge'

type Mode = 'requester' | 'decider'

function ErrorNotice({ text }: { text: string }) { return text ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{text}</p> : null }
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
            <Route path="new" element={<NewRequest />} />
            <Route path=":requestId" element={<RequestDetail client={client} mode={profile.enabled ? (profile.actor === 'decider' ? 'decider' : 'requester') : mode} />} />
            <Route path="*" element={<h1>Страница не найдена</h1>} />
          </Routes></div>}
      </div>
  </>
}

function RequestList({ client }: { client: Client }) {
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
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1>Заявки на доступ</h1><p>Заявки, доступные по серверным полномочиям.</p></div><Button asChild><Link to="/access-requests/new">Новая заявка</Link></Button></div>
    <ErrorNotice text={error} />
    {error && <Button variant="outline" onClick={() => setReload(x => x + 1)}>Повторить</Button>}
    {!page && !error && <p role="status">Загрузка заявок…</p>}
    {page && (page.items.length === 0 ? <p>Нет доступных заявок.</p> : <div className="overflow-x-auto"><table className="ux-table">
      <thead><tr>{['Заявка', 'Подана', 'Заявитель', 'Статус'].map(t => <th className="border-b px-2 py-3" key={t}>{t}</th>)}</tr></thead>
      <tbody>{page.items.map(r => <tr key={r.requestId}><td className="border-b px-2 py-4"><Link className="font-mono text-xs" to={'/access-requests/' + r.requestId + (offset ? '?offset=' + offset : '')}>{r.requestId}</Link></td><td className="border-b px-2 py-4">{new Date(r.submittedAt).toLocaleString()}</td><td className="border-b px-2 py-4 font-mono text-xs">{r.requesterActorId}</td><td className="border-b px-2 py-4"><Status value={r.status} /></td></tr>)}</tbody>
    </table></div>)}
    {page && <div className="flex items-center gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - page.limit))}>Назад</Button><span className="text-sm">Страница {Math.floor(offset / page.limit) + 1}</span><Button variant="outline" disabled={!page.hasMore} onClick={() => setOffset(offset + page.limit)}>Далее</Button></div>}
  </section>
}

function NewRequest() {
  return <section className="panel"><h1>Новая заявка</h1><p>Выберите сохранённую потребность процесса, затем Revision и два Deployment. Допуск создаёт PENDING, а не разрешение.</p><Link to="/business-processes">Выбрать процесс и потребность</Link></section>
}

function Evidence({ entries }: { entries: Record<string, string | null> }) {
  return <dl className="ux-properties">{Object.entries(entries).map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="mt-1 break-all font-mono text-xs">{v ?? 'null'}</dd></div>)}</dl>
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
  useEffect(() => { setFeedback('') }, [requestId])
  useEffect(() => {
    let active = true
    setRequest(null); setError('')
    client.request(requestId).then(r => { if (active) setRequest(r) }).catch(e => { if (active) setError(message(e)) })
    return () => { active = false }
  }, [client, requestId, reload])
  return <section className="panel space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1>Заявка на доступ</h1><Button variant="outline" onClick={() => setReload(x => x + 1)}>Обновить статус</Button></div>
    <ErrorNotice text={error} />
    {!request && !error && <p role="status">Загрузка заявки…</p>}
    {feedback && <p role="status">{feedback}</p>}
    {request && request.requestId === requestId && <><Status value={request.status} /><nav className="ux-tabs" aria-label="Вкладки заявки"><Link to={tabPath('overview')} aria-current={!decisionTab ? 'page' : undefined}>Обзор</Link><Link to={tabPath('decision')} aria-current={decisionTab ? 'page' : undefined}>Решение и основания</Link></nav>{!decisionTab && <><Evidence entries={{ requestId: request.requestId, subjectId: request.subjectId, requesterActorId: request.requesterActorId, submittedAt: request.submittedAt, connectivityNeedId: request.connectivityNeedId, ...request.subject }} />
      <h2>Основания допуска</h2><Evidence entries={request.admission} />
      </>}{decisionTab && <><h2>Решение сервера</h2>{request.decision ? <Evidence entries={request.decision} /> : <p>Решение ещё не принято.</p>}</>}
      {request.decision?.policyRuleId && <Link to={'/policy-rules/' + request.decision.policyRuleId}>Открыть правило политики</Link>}
      {mode === 'decider' && request.status === 'PENDING' && <DecisionPanel key={requestId} client={client} requestId={requestId} refresh={text => { setFeedback(text); setReload(x => x + 1) }} />}
    </>}
  </section>
}

function DecisionPanel({ client, requestId, refresh }: { client: Client; requestId: string; refresh: (text: string) => void }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function confirm() {
    if (!outcome || submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try {
      await client.decide(requestId, outcome)
      if (alive.current) refresh('Решение сохранено. Загружается серверный статус.')
    } catch (e) {
      if (!alive.current) return
      if (e instanceof ApiError && e.status === 409) refresh(message(e))
      else setError(message(e))
    } finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="space-y-4 border-t pt-6" aria-label="Decision">
    <h2>Принять решение</h2><p className="text-sm text-slate-500">Сервер проверяет полномочия. Подтверждённое решение окончательно.</p>
    <ErrorNotice text={error} />
    {!outcome ? <div className="flex flex-wrap gap-3"><Button onClick={() => setOutcome('ALLOWED')}>ALLOWED</Button><Button variant="destructive" onClick={() => setOutcome('DENIED')}>DENIED</Button></div> :
      <div role="group" aria-label="Подтверждение решения" className="space-y-3 rounded-lg border bg-slate-50 p-4">
        <p>Подтвердить {outcome} для этой заявки? Изменить решение нельзя.</p>
        <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={confirm}>{busy ? 'Сохранение…' : `Подтвердить ${outcome}`}</Button><Button variant="outline" disabled={busy} onClick={() => { setOutcome(null); setError('') }}>Отмена</Button></div>
      </div>}
  </section>
}
