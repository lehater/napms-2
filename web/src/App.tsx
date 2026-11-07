import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, message, type AccessInput, type AccessRequest, type Client, type Collection, type Outcome } from './api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Mode = 'requester' | 'decider'

function ErrorNotice({ text }: { text: string }) { return text ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{text}</p> : null }
function Status({ value }: { value: AccessRequest['status'] }) {
  return <Badge variant="outline" className={value === 'ALLOWED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : value === 'DENIED' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}>{value}</Badge>
}

export default function App() {
  const [mode, setMode] = useState<Mode>('requester')
  const [token, setToken] = useState('')
  const [draft, setDraft] = useState('')
  const [epoch, setEpoch] = useState(0)
  const [notice, setNotice] = useState('')
  function clear() { setToken(''); setDraft(''); setEpoch(e => e + 1) }
  const client = useMemo(() => api(token, () => { clear(); setNotice('Credential expired or invalid. Enter a valid token again.') }), [token])
  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
      <Link className="text-xl font-semibold tracking-tight" to="/access-requests">NAPMS <span className="text-slate-400">/</span> <span className="text-base font-normal">Access requests</span></Link>
      <Badge variant="outline">Local demo</Badge>
    </div></header>
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-6">
        <nav aria-label="Main navigation" className="flex flex-col gap-2"><Link to="/access-requests">Requests</Link><Link to="/access-requests/new">New request</Link></nav>
        <section className="space-y-3 rounded-lg border bg-white p-4" aria-label="Demo credentials">
          <label className="text-sm font-medium" htmlFor="mode">Demo mode</label>
          <select id="mode" className="w-full rounded-md border p-2" value={mode} onChange={e => { clear(); setNotice(''); setMode(e.target.value as Mode) }}>
            <option value="requester">Requester</option><option value="decider">Decider</option>
          </select>
          <p className="text-xs text-slate-500">Display hint only. The server checks the token’s grants.</p>
          {token ? <><p className="text-sm" role="status">Credential active · {mode}</p><Button variant="outline" onClick={() => { clear(); setNotice('') }}>Clear credential</Button></> :
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); setToken(draft.trim()); setDraft(''); setNotice('') }}>
              <label className="text-sm" htmlFor="token">Bearer token</label>
              <Input id="token" type="password" value={draft} autoComplete="off" onChange={e => setDraft(e.target.value)} required />
              <Button type="submit" disabled={!draft.trim()}>Use token</Button>
            </form>}
          <p className="text-xs text-slate-500">Stored in this tab’s memory. Re-enter after refresh or mode change.</p>
        </section>
      </aside>
      <main className="min-w-0 space-y-5">
        <ErrorNotice text={notice} />
        {!token ? <section className="panel"><h1>Enter a demo credential</h1><p>Choose a mode and paste its token from your private local credential file.</p></section> :
          <div key={epoch + ':' + mode}><Routes>
            <Route path="/access-requests" element={<RequestList client={client} />} />
            <Route path="/access-requests/new" element={<NewRequest client={client} />} />
            <Route path="/access-requests/:requestId" element={<RequestDetail client={client} mode={mode} />} />
            <Route path="*" element={<Navigate to="/access-requests" replace />} />
          </Routes></div>}
      </main>
    </div>
  </div>
}

function RequestList({ client }: { client: Client }) {
  const [offset, setOffset] = useState(0)
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
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1>Requests</h1><p>Your server-authorized requests and their current status.</p></div><Link className="text-sm font-medium" to="/access-requests/new">+ New request</Link></div>
    <ErrorNotice text={error} />
    {error && <Button variant="outline" onClick={() => setReload(x => x + 1)}>Retry</Button>}
    {!page && !error && <p role="status">Loading requests…</p>}
    {page && (page.items.length === 0 ? <p>No visible requests yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr>{['Request', 'Submitted', 'Requester', 'Status'].map(t => <th className="border-b px-2 py-3" key={t}>{t}</th>)}</tr></thead>
      <tbody>{page.items.map(r => <tr key={r.requestId}><td className="border-b px-2 py-4"><Link className="font-mono text-xs" to={'/access-requests/' + r.requestId}>{r.requestId}</Link></td><td className="border-b px-2 py-4">{new Date(r.submittedAt).toLocaleString()}</td><td className="border-b px-2 py-4 font-mono text-xs">{r.requesterActorId}</td><td className="border-b px-2 py-4"><Status value={r.status} /></td></tr>)}</tbody>
    </table></div>)}
    {page && <div className="flex items-center gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - page.limit))}>Previous</Button><span className="text-sm">Page {Math.floor(offset / page.limit) + 1}</span><Button variant="outline" disabled={!page.hasMore} onClick={() => setOffset(offset + page.limit)}>Next</Button></div>}
  </section>
}

const demo: AccessInput = {
  sourceDeploymentId: '00000000-0000-0000-0000-00000000000a',
  destinationDeploymentId: '00000000-0000-0000-0000-00000000000b',
  interactionRevisionId: '00000000-0000-0000-0000-000000000009',
  connectivityNeedId: '00000000-0000-0000-0000-00000000000d',
}
function NewRequest({ client }: { client: Client }) {
  const [data, setData] = useState<AccessInput>(demo)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const navigate = useNavigate()
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try { const r = await client.create(data); if (alive.current) navigate('/access-requests/' + r.requestId) }
    catch (e) { if (alive.current) setError(message(e)) }
    finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="panel space-y-5"><div><h1>New request</h1><p>Public demo references are prefilled. Admission creates a PENDING request.</p></div>
    <ErrorNotice text={error} />
    <form className="space-y-5" onSubmit={submit}>
      {(Object.keys(demo) as (keyof AccessInput)[]).map(key => <div className="space-y-2" key={key}><label htmlFor={key}>{key}</label><Input id={key} value={data[key]} onChange={e => setData({ ...data, [key]: e.target.value })} required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" title="Enter a UUID" disabled={busy} /></div>)}
      <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create request'}</Button>
    </form>
  </section>
}

function Evidence({ entries }: { entries: Record<string, string | null> }) {
  return <dl className="grid gap-4 text-sm sm:grid-cols-2">{Object.entries(entries).map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="mt-1 break-all font-mono text-xs">{v ?? 'null'}</dd></div>)}</dl>
}
function RequestDetail({ client, mode }: { client: Client; mode: Mode }) {
  const { requestId = '' } = useParams()
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
  return <section className="panel space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1>Request details</h1><Button variant="outline" onClick={() => setReload(x => x + 1)}>Reload status</Button></div>
    <ErrorNotice text={error} />
    {!request && !error && <p role="status">Loading request…</p>}
    {feedback && <p role="status">{feedback}</p>}
    {request && request.requestId === requestId && <><Status value={request.status} /><Evidence entries={{ requestId: request.requestId, subjectId: request.subjectId, requesterActorId: request.requesterActorId, submittedAt: request.submittedAt }} />
      <h2>Admission evidence</h2><Evidence entries={request.admission} />
      <h2>Decision evidence</h2>{request.decision ? <Evidence entries={request.decision} /> : <p>No decision recorded.</p>}
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
      if (alive.current) refresh('Decision saved. Reloading stored status from the API.')
    } catch (e) {
      if (!alive.current) return
      if (e instanceof ApiError && e.status === 409) refresh(message(e))
      else setError(message(e))
    } finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="space-y-4 border-t pt-6" aria-label="Decision">
    <h2>Record a decision</h2><p className="text-sm text-slate-500">The server verifies decision authority. A confirmed decision is final.</p>
    <ErrorNotice text={error} />
    {!outcome ? <div className="flex gap-3"><Button onClick={() => setOutcome('ALLOWED')}>ALLOWED</Button><Button variant="destructive" onClick={() => setOutcome('DENIED')}>DENIED</Button></div> :
      <div role="group" aria-label="Confirm decision" className="space-y-3 rounded-lg border bg-slate-50 p-4">
        <p>Confirm {outcome} for this request? This cannot be changed.</p>
        <div className="flex gap-3"><Button disabled={busy} onClick={confirm}>{busy ? 'Saving…' : `Confirm ${outcome}`}</Button><Button variant="outline" disabled={busy} onClick={() => { setOutcome(null); setError('') }}>Cancel</Button></div>
      </div>}
  </section>
}
