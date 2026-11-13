import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, message, type Client, type NeedPage, type RuleSummary } from './api'
import { useDemoProfile } from './DemoProfile'
import { Button } from './components/ui/button'

export default function PolicyRules() {
  const profile = useDemoProfile()
  const [token, setToken] = useState(''), [draft, setDraft] = useState('')
  const session = useRef(0)
  const client = useMemo(() => {
    const current = session.current
    return api(token, () => { if (current === session.current) { session.current++; setToken(''); setDraft('') } })
  }, [token])
  return <><nav className="ux-breadcrumbs" aria-label="Breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><span aria-current="page">Правила политики</span></nav><section className="ux-panel ux-panel-body"><h1>Правила политики</h1>
    {!profile.enabled && <section aria-label="Demo credentials">{token ? <Button onClick={() => { session.current++; setToken('') }}>Очистить credential</Button> : <form onSubmit={e => { e.preventDefault(); session.current++; setToken(draft.trim()); setDraft('') }}><label>Bearer token<input type="password" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)} /></label><Button disabled={!draft.trim()}>Применить token</Button></form>}</section>}
    {(profile.enabled || token) && <RuleList key={token + ':' + profile.actor} client={profile.client ?? client} />}
  </section></>
}

function RuleList({ client }: { client: Client }) {
  const [offset, setOffset] = useState(0), [reload, setReload] = useState(0)
  const [page, setPage] = useState<NeedPage<RuleSummary> | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const alive = useRef(true), downloading = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true; setPage(null); setError('')
    client.rules(offset).then(p => { if (active) setPage(p) }).catch(e => { if (active) setError(message(e)) })
    return () => { active = false }
  }, [client, offset, reload])
  async function download(format: 'json' | 'csv') {
    if (downloading.current) return
    downloading.current = true; setBusy(true); setError('')
    try {
      const bytes = await client.downloadCurrent(format)
      if (!alive.current) return
      const url = URL.createObjectURL(bytes), link = document.createElement('a')
      link.href = url; link.download = `authorized-current-policy.${format}`; document.body.append(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (e) { if (alive.current) setError(message(e)) }
    finally { downloading.current = false; if (alive.current) setBusy(false) }
  }
  return <><p>Здесь сохранённые канонические правила, доступные по вашим полномочиям на оба ресурса.</p>
    <h2>Выгрузить доступную текущую политику</h2><p>Выгрузка содержит только доступные вам ACTIVE правила. Это доступная выборка, а не вся глобальная политика системы. INACTIVE остаются в списке и не попадают в текущую политику.</p>
    <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => download('json')}>Текущая политика · JSON</Button><Button disabled={busy} onClick={() => download('csv')}>Текущая политика · CSV</Button></div>
    {error && <p role="alert">{error}</p>}{!page && !error && <p role="status">Загрузка правил…</p>}
    {page && (page.items.length ? <div className="ux-table-scroll"><table className="ux-table"><thead><tr><th>Правило</th><th>Состояние</th><th>Трафик</th><th>Разрешения</th></tr></thead><tbody>{page.items.map(r => <tr key={r.ruleId}><td><Link to={'/policy-rules/' + r.ruleId}>{r.displayLabel}</Link><small className="block font-mono">{r.ruleId}</small></td><td>{r.state}</td><td>{r.trafficLabel}</td><td>{r.allowanceDecisionIds.length} · <Link to={'/policy-rules/' + r.ruleId}>Происхождение и Detail</Link></td></tr>)}</tbody></table></div> : <p>Нет доступных правил на этой странице.</p>)}
    <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Предыдущие правила</Button><Button variant="outline" disabled={!page?.hasMore} onClick={() => setOffset(offset + 20)}>Следующие правила</Button><Button variant="outline" onClick={() => setReload(x => x + 1)}>Обновить правила</Button></div>
  </>
}
