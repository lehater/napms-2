import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, message, type Client, type NeedPage, type RuleSummary } from './api'
import { useDemoProfile } from './DemoProfile'
import { Button } from './components/ui/button'
import { CollectionView } from './components/real/CollectionView'

export default function PolicyRules() {
  const profile = useDemoProfile()
  const [token, setToken] = useState(''), [draft, setDraft] = useState('')
  const session = useRef(0)
  const client = useMemo(() => {
    const current = session.current
    return api(token, () => { if (current === session.current) { session.current++; setToken(''); setDraft('') } })
  }, [token])
  return <><nav className="ux-breadcrumbs" aria-label="Breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><span aria-current="page">Правила политики</span></nav>
    {!profile.enabled && <section aria-label="Demo credentials">{token ? <Button onClick={() => { session.current++; setToken('') }}>Очистить credential</Button> : <form onSubmit={e => { e.preventDefault(); session.current++; setToken(draft.trim()); setDraft('') }}><label>Bearer token<input type="password" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)} /></label><Button disabled={!draft.trim()}>Применить token</Button></form>}</section>}
    {(profile.enabled || token) && <RuleList key={token + ':' + profile.actor} client={profile.client ?? client} />}
  </>
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
  const rows = page?.items ?? []
  return <CollectionView<RuleSummary> title="Правила политики" description="Выгрузка содержит только доступные вам ACTIVE правила. Это доступная выборка, а не вся глобальная политика системы." actions={<><div className="ux-note">Сохранённые канонические правила, доступные по вашим полномочиям на оба ресурса.</div><Button disabled={busy} onClick={() => download('json')}>Текущая политика · JSON</Button><Button variant="outline" disabled={busy} onClick={() => download('csv')}>Текущая политика · CSV</Button></>}
    rows={rows} columns={[
      { key: 'rule', title: 'Правило', render: r => <><Link to={'/policy-rules/' + r.ruleId}>{r.participantsLabel}</Link><small>{r.applicationLabel} · {r.sourceResourceLabel} → {r.destinationResourceLabel}</small></> },
      { key: 'state', title: 'Состояние', render: r => r.state },
      { key: 'traffic', title: 'Трафик', render: r => r.trafficLabel },
      { key: 'allowances', title: 'Основания', render: r => <Link to={'/policy-rules/' + r.ruleId}>{r.allowanceDecisionIds.length} · Происхождение и Detail</Link> },
    ]} getKey={r => r.ruleId} emptyText="Нет доступных вам правил" loading={!page && !error} error={error} offset={offset} limit={20} hasMore={page?.hasMore} onPrevious={() => setOffset(Math.max(0, offset - 20))} onNext={() => setOffset(offset + 20)} onRefresh={() => setReload(x => x + 1)} />
}
