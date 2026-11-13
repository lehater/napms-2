import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, message, type Client, type Rule } from './api'
import { useDemoProfile } from './DemoProfile'
import { Button } from './components/ui/button'

export default function PolicyRule() {
  const profile = useDemoProfile(), { ruleId = '' } = useParams()
  const [token, setToken] = useState(''), [draft, setDraft] = useState('')
  const session = useRef(0)
  const client = useMemo(() => {
    const current = session.current
    return api(token, () => { if (current === session.current) { session.current++; setToken(''); setDraft('') } })
  }, [token])
  return <><nav className="ux-breadcrumbs" aria-label="Breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><Link to="/access-requests">Заявки на доступ</Link><span>/</span><span aria-current="page">Правило политики</span></nav><section className="ux-panel ux-panel-body"><h1>Правило политики</h1>
    {!profile.enabled && <section aria-label="Demo credentials">{token ? <Button onClick={() => { session.current++; setToken('') }}>Очистить credential</Button> : <form onSubmit={e => { e.preventDefault(); session.current++; setToken(draft.trim()); setDraft('') }}><label>Bearer token<input type="password" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)} /></label><Button disabled={!draft.trim()}>Применить token</Button></form>}</section>}
    {(profile.enabled || token) && <RuleDetail key={ruleId + ':' + token + ':' + profile.actor} ruleId={ruleId} client={profile.client ?? client} />}
    <Link to="/access-requests">К заявкам на доступ</Link>
  </section></>
}
function RuleDetail({ ruleId, client }: { ruleId: string; client: Client }) {
  const [rule, setRule] = useState<Rule | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [reload, setReload] = useState(0)
  const alive = useRef(true), downloading = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true; setRule(null); setError('')
    client.rule(ruleId).then(r => { if (active) setRule(r) }).catch(e => { if (active) setError(message(e)) })
    return () => { active = false }
  }, [client, ruleId, reload])
  async function download(format: 'json' | 'csv') {
    if (downloading.current || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ruleId)) return
    downloading.current = true; setBusy(true); setError('')
    try {
      const bytes = await client.download(ruleId, format)
      if (!alive.current) return
      const url = URL.createObjectURL(bytes), link = document.createElement('a')
      link.href = url; link.download = `policy-rule-${ruleId}.${format}`; document.body.append(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (e) { if (alive.current) setError(message(e)) }
    finally { downloading.current = false; if (alive.current) setBusy(false) }
  }
  return <>{error && <p role="alert">{error}</p>}{!rule && !error && <p role="status">Загрузка PolicyRule…</p>}<Button variant="outline" onClick={() => setReload(x => x + 1)}>Обновить PolicyRule</Button>
    {rule && <><p>{rule.ruleId} · {rule.state}</p><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => download('json')}>Скачать JSON</Button><Button disabled={busy} onClick={() => download('csv')}>Скачать CSV</Button></div><h2>Точный Subject</h2><dl className="ux-properties">{Object.entries(rule.subject).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><h2>Происхождение и разрешения</h2><pre className="overflow-x-auto">{JSON.stringify({ originatingRequest: rule.originatingRequest, originatingDecision: rule.originatingDecision, allowances: rule.allowances }, null, 2)}</pre><p>{rule.state === 'INACTIVE' ? 'INACTIVE: экспорт не содержит строк.' : 'READY / INCOMPLETE определяет сервер при экспорте.'} Политика не доказывает сетевую доступность.</p></>}
  </>
}
