import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, message, type Client, type Rule } from './api'
import { useDemoProfile } from './DemoProfile'
import { Button } from './components/ui/button'
import { DetailView } from './components/real/DetailView'
import { EntityTable } from './components/real/EntityTable'

export default function PolicyRule() {
  const profile = useDemoProfile(), { ruleId = '' } = useParams()
  const [token, setToken] = useState(''), [draft, setDraft] = useState('')
  const session = useRef(0)
  const client = useMemo(() => {
    const current = session.current
    return api(token, () => { if (current === session.current) { session.current++; setToken(''); setDraft('') } })
  }, [token])
  return <>
    {!profile.enabled && <section aria-label="Demo credentials">{token ? <Button onClick={() => { session.current++; setToken('') }}>Очистить credential</Button> : <form onSubmit={e => { e.preventDefault(); session.current++; setToken(draft.trim()); setDraft('') }}><label>Bearer token<input type="password" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)} /></label><Button disabled={!draft.trim()}>Применить token</Button></form>}</section>}
    {(profile.enabled || token) && <RuleDetail key={ruleId + ':' + token + ':' + profile.actor} ruleId={ruleId} client={profile.client ?? client} />}
  </>
}
function RuleDetail({ ruleId, client }: { ruleId: string; client: Client }) {
  const [params] = useSearchParams()
  const activeTab = ['overview', 'subject', 'authorization'].includes(params.get('tab') ?? '') ? params.get('tab')! : 'overview'
  const tabPath = (tab: string) => { const next = new URLSearchParams(params); next.set('tab', tab); return '?' + next }
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
  if (!rule) return <><nav className="ux-breadcrumbs" aria-label="Breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><Link to="/policy-rules">Правила политики</Link><span>/</span><span aria-current="page">Правило политики</span></nav><section className="ux-panel ux-panel-body">{error ? <p role="alert">{error}</p> : <p role="status">Загрузка PolicyRule…</p>}<Button variant="outline" onClick={() => setReload(x => x + 1)}>Обновить PolicyRule</Button></section></>
  return <DetailView breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to="/policy-rules">Правила политики</Link><span>/</span><span aria-current="page">{rule.participantsLabel}</span></>}
    title={rule.participantsLabel} subtitle={<>{rule.applicationLabel} · {rule.sourceResourceLabel} → {rule.destinationResourceLabel}</>} state={rule.state}
    actions={<><Button variant="outline" onClick={() => setReload(x => x + 1)}>Обновить PolicyRule</Button><Button disabled={busy} onClick={() => download('json')}>Скачать JSON</Button><Button variant="outline" disabled={busy} onClick={() => download('csv')}>Скачать CSV</Button></>}
    tabs={[{id:'overview',label:'Обзор',href:tabPath('overview')},{id:'subject',label:'Предмет доступа',href:tabPath('subject')},{id:'authorization',label:'Основания разрешения',href:tabPath('authorization')}]} activeTab={activeTab}>
      {error && <p role="alert">{error}</p>}
      {activeTab === 'overview' && <>
        <dl className="ux-properties">
          <div><dt>Коммуникация</dt><dd>{rule.participantsLabel}</dd></div>
          <div><dt>Источник (Resource)</dt><dd>{rule.sourceResourceLabel}</dd></div>
          <div><dt>Назначение (Resource)</dt><dd>{rule.destinationResourceLabel}</dd></div>
          <div><dt>Трафик</dt><dd>{rule.trafficLabel}</dd></div>
          <div><dt>Оснований разрешения</dt><dd>{rule.allowances.length}</dd></div>
        </dl>
        <p className="ux-note">ACTIVE не подтверждает сетевую связность; READY или INCOMPLETE вычисляется при экспорте.</p>
        <details><summary>Идентификатор правила</summary><code>{rule.ruleId}</code></details>
      </>}
      {activeTab === 'subject' && <>
        <dl className="ux-properties">
          <div><dt>Компоненты</dt><dd>{rule.participantsLabel}</dd></div>
          <div><dt>Профиль приложения</dt><dd>{rule.applicationLabel}</dd></div>
          <div><dt>Источник (Resource)</dt><dd>{rule.sourceResourceLabel}</dd></div>
          <div><dt>Назначение (Resource)</dt><dd>{rule.destinationResourceLabel}</dd></div>
          <div><dt>Исходный Deployment ID</dt><dd>{rule.subject.sourceDeploymentId}</dd></div>
          <div><dt>Целевой Deployment ID</dt><dd>{rule.subject.destinationDeploymentId}</dd></div>
          <div><dt>Revision ID</dt><dd>{rule.subject.interactionRevisionId}</dd></div>
          <div><dt>AccessSubject ID</dt><dd>{rule.subjectId}</dd></div>
        </dl>
      </>}
      {activeTab === 'authorization' && <>
        <h2>Исходное решение</h2>
        <dl className="ux-properties">
          <div><dt>Заявка</dt><dd><Link to={'/access-requests/' + rule.originatingRequest.requestId}>{rule.originatingRequest.listLabel}</Link><small>{rule.originatingRequest.listContext} · {rule.originatingRequest.requestId}</small></dd></div>
          <div><dt>Решение</dt><dd>{rule.originatingDecision.outcome}<small>{rule.originatingDecision.decisionId}</small></dd></div>
          <div><dt>Связанная потребность</dt><dd>{rule.connectivityNeedId}</dd></div>
        </dl>
        <p className="ux-note">Для открытия связанной заявки нужны отдельные полномочия на её чтение.</p>
        <h2>Основания разрешения</h2>
        <EntityTable rows={rule.allowances} columns={[{key:'decision',title:'Решение',render:a=>a.outcome},{key:'заявка',title:'Заявка',render:a=><Link to={'/access-requests/' + a.requestId}>{a.requestId}</Link>}]} getKey={a=>a.decisionId} emptyText="Нет разрешений." />
      </>}
    </DetailView>
}
