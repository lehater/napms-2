import { createContext, useContext } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Collection, type Row, type Column } from './Resources'
import { byId, objectPath, stateDefinitions, dataNature, natureLabel, type MockObject, type Kind } from './data'
import { NeedCommunication, SubjectSummary } from './NeedCommunication'
import { SimulationActions } from './SimulationActions'
import { subjectOf, subjectLabel, useSimulation, type Scenario } from './simulation'
export const ObjectIndex = createContext(byId)
export const related = (object: MockObject, ...kinds: Kind[]) => object.links.map(link => byId.get(link.id)).filter((item): item is MockObject => !!item && kinds.includes(item.kind))
function useRelated() { const index = useContext(ObjectIndex); return (object: MockObject, ...kinds: Kind[]) => object.links.map(l => index.get(l.id)).filter((item): item is MockObject => !!item && kinds.includes(item.kind)) }
export function ObjectStatus({ object }: { object: MockObject }) {
  const label = stateDefinitions[object.kind].label
  return object.state && label ? <span role="status" aria-label={label} className="ux-state" data-state={object.state}><small>{label}</small>{object.state}</span> : null
}
function relationLabel(related: ReturnType<typeof useRelated>, parent: MockObject | undefined, object: MockObject): string {
  if (!parent) return ''
  const direct = parent.links.find(link => link.id === object.id)?.label
  if (direct) return direct
  if (parent.kind === 'PolicyRule') {
    for (const request of related(parent, 'AccessRequest').filter(item => item.state === 'ALLOWED')) {
      const role = request.links.find(link => link.id === object.id)?.label
      if (role) return role + ' · ALLOWED provenance'
    }
  }
  return ''
}
const names = (related: ReturnType<typeof useRelated>, object: MockObject, ...kinds: Kind[]) => related(object, ...kinds).map(item => item.name).join('\n')
function values(object: MockObject, related: ReturnType<typeof useRelated>) {
  return { name: object.name, summary: object.summary, state: object.state ?? '—', component: object.fields.component ?? '', components: object.fields.components?.split(' → ').join('\n') ?? '', interactions: names(related, object, 'Interaction'), resource: names(related, object, 'Resource'), application: names(related, object, 'Application'), responsible: object.fields.responsible ?? '', needs: names(related, object, 'ConnectivityNeed'), process: names(related, object, 'BusinessProcess'), participant: object.fields.participantComponent ?? '', requester: object.fields.requester ?? '', submittedAt: object.fields.submittedAt ?? 'Не указан в fixture', subject: subjectOf(object) ? subjectLabel(subjectOf(object)!) : object.fields.subject ?? related(object, 'ComponentDeployment', 'InteractionRevision').map(item => item.name).join('\n'), provenance: object.fields.RuleAuthorizationEvidence ?? '' }
}
const c = (key: string, title: string): Column => ({ key, title })
const nameColumn: Column = { key: 'name', title: 'Объект', render: row => <><Link to={row.path!}>{row.values.name}</Link><small>{row.id}</small></> }
function RowStatus({ id }: { id: string }) { return <ObjectStatus object={useContext(ObjectIndex).get(id)!} /> }
const stateColumn: Column = { key: 'state', title: 'Состояние', render: row => <RowStatus id={row.id} /> }
const columns: Partial<Record<Kind, Column[]>> = {
  Application: [c('components', 'Компоненты'), c('interactions', 'Коммуникации'), c('summary', 'Назначение')],
  ComponentDeployment: [c('component', 'Компонент'), c('application', 'Профиль приложения'), c('resource', 'Ресурс'), stateColumn],
  BusinessProcess: [c('summary', 'Назначение'), c('responsible', 'Ответственность'), c('needs', 'Потребности')],
  ConnectivityNeed: [c('process', 'Бизнес-процесс'), c('interactions', 'Коммуникация'), c('participant', 'Участник'), c('summary', 'Обоснование')],
  AccessRequest: [c('subject', 'Предмет доступа'), c('requester', 'Заявитель'), c('submittedAt', 'Время подачи'), stateColumn],
  PolicyRule: [c('subject', 'Предмет разрешения'), stateColumn, c('provenance', 'Authorization provenance')],
}
export function ObjectCollection({ rows, title, remote = false, parent }: { parent?: MockObject; rows: readonly MockObject[]; title: string; remote?: boolean }) {
  const related = useRelated()
  const [params] = useSearchParams()
  const context = new URLSearchParams(params); context.delete('tab')
  return <Collection label={title} remote={remote} rows={rows.map(object => ({ id: object.id, kind: object.kind, path: objectPath(object) + (remote && context.size ? '?' + context : ''), values: { ...values(object, related), relation: relationLabel(related, parent, object) } }))} columns={[nameColumn, ...(parent ? [c('relation', 'Связь / роль')] : []), ...(columns[rows[0]?.kind] ?? [c('summary', 'Назначение'), stateColumn])]} filters={remote && rows.some(object => object.state) ? [{ key: 'state', title: 'Состояние' }] : []} />
}
function Properties({ fields }: { fields: Record<string, string> }) {
  return <dl className="ux-properties">{Object.entries(fields).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
}
type Tab = { id: string; title: string; objects?: MockObject[]; fields?: Record<string, string>; rows?: Row[]; note?: string }
function tabsFor(object: MockObject, related: ReturnType<typeof useRelated>, index: Map<string, MockObject>): Tab[] {
  const tabs: Tab[] = []
  const add = (id: string, title: string, ...kinds: Kind[]) => { const rows = related(object, ...kinds); if (rows.length) tabs.push({ id, title, objects: rows }) }
  const fields = (id: string, title: string, keys: string[]) => { const entries = Object.fromEntries(keys.filter(key => object.fields[key] !== undefined).map(key => [key, object.fields[key]])); if (Object.keys(entries).length) tabs.push({ id, title, fields: id === 'decision' ? { outcome: object.state!, ...entries } : entries }) }
  switch (object.kind) {
    case 'Application':
      if (object.fields.components) tabs.push({ id: 'components', title: 'Компоненты', rows: object.fields.components.split(' → ').map(name => ({ id: name, values: { name, summary: 'Роль в профиле ' + object.name } })), note: 'Компоненты представлены ролями в fixture; самостоятельные записи и ID отсутствуют.' })
      add('interactions', 'Коммуникации', 'Interaction'); break
    case 'Interaction': add('revisions', 'Ревизии', 'InteractionRevision'); add('profile', 'Профиль', 'Application'); add('needs', 'Потребности', 'ConnectivityNeed'); break
    case 'InteractionRevision': add('interaction', 'Коммуникация', 'Interaction'); add('deployments', 'Участники', 'ComponentDeployment'); break
    case 'ComponentDeployment': add('profile', 'Компонент и профиль', 'Application'); add('resource', 'Ресурс', 'Resource'); add('interactions', 'Коммуникации', 'Interaction'); break
    case 'BusinessProcess': add('needs', 'Потребности', 'ConnectivityNeed'); break
    case 'ConnectivityNeed': add('profile', 'Профиль', 'Application'); add('communication', 'Коммуникация', 'Interaction'); add('process', 'Бизнес-процесс', 'BusinessProcess'); add('requests', 'Заявки', 'AccessRequest'); add('rules', 'Правила', 'PolicyRule'); break
    case 'AccessRequest':
      add('subject', 'Предмет доступа', 'ComponentDeployment', 'InteractionRevision'); fields('decision', 'Решение и evidence', ['decisionId', 'decider', 'decisionAt', 'decisionAuthority', 'RequestAuthorityEvidence', 'policyRuleId']); add('need', 'Бизнес-основание', 'ConnectivityNeed', 'BusinessProcess'); add('rule', 'Результат разрешения', 'PolicyRule'); break
    case 'PolicyRule': {
      // Read participants from ALLOWED provenance only; DENIED is never an authorization.
      const allowed = related(object, 'AccessRequest').filter(request => request.state === 'ALLOWED')
      const subject = [...new Map([...related(object, 'InteractionRevision'), ...allowed.flatMap(request => related(request, 'ComponentDeployment'))].map(item => [item.id, item])).values()]
      if (subject.length) tabs.push({ id: 'subject', title: 'Предмет доступа', objects: subject })
      if (allowed.length) tabs.push({ id: 'authorization', title: 'Основания разрешения', objects: allowed, fields: { RuleAuthorizationEvidence: object.fields.RuleAuthorizationEvidence } })
      add('needs', 'Бизнес-основание', 'ConnectivityNeed'); add('projection', 'Вычисляемая проекция', 'TargetRequiredPolicy'); break
    }
    default: for (const kind of new Set(object.links.map(link => index.get(link.id)!.kind))) add(kind, kind, kind)
  }
  return tabs
}
export function ObjectDetail({ object }: { object: MockObject }) {
  const related = useRelated()
  const { resetVersion } = useSimulation()
  const [params] = useSearchParams()
  const tabs = tabsFor(object, related, useContext(ObjectIndex))
  const selected = tabs.find(tab => tab.id === params.get('tab'))
  const overview = !selected
  const scenario: Scenario = params.get('scenario') === 'B' ? 'B' : params.get('scenario') === 'C' ? 'C' : 'A'
  const simulatedRequest = object.id.startsWith('mock-simulation-request-')
  const subject = ['AccessRequest', 'PolicyRule'].includes(object.kind) ? subjectOf(object) : undefined
  const origin = object.kind === 'PolicyRule' ? related(object, 'AccessRequest').find(r => r.state === 'ALLOWED') : undefined
  const isCommunication = object.kind === 'Application' || object.kind === 'Interaction'
  const communications = object.kind === 'Application' ? related(object, 'Interaction') : [object]
  return <>
    <nav aria-label="Object tabs" className="ux-tabs">{[{ id: 'overview', title: 'Обзор' }, ...tabs].map(tab => { const next = new URLSearchParams(params); if (tab.id === 'overview') next.delete('tab'); else next.set('tab', tab.id); return <Link key={tab.id} to={{ pathname: objectPath(object), search: next.toString() }} aria-current={(overview ? tab.id === 'overview' : selected.id === tab.id) ? 'page' : undefined}>{tab.title}</Link> })}</nav>
    {object.kind === 'ConnectivityNeed' && selected?.id === 'communication' ? <NeedCommunication key={object.id + scenario + resetVersion} object={object} scenario={scenario} /> : overview ? <div className={simulatedRequest ? 'nid-request-grid' : 'ux-detail-grid'}>
      <section className="ux-panel" aria-label="Карточка объекта"><h2>{object.kind} · Обзор</h2><div className="ux-panel-body"><ObjectStatus object={object} />
        {isCommunication ? <div className="ux-communication">{communications.map(item => <div key={item.id}><p className="ux-eyebrow">Направленная коммуникация</p><p className="ux-direction"><strong>{item.fields.sourceComponent}</strong><span aria-label="Направление коммуникации">→</span><strong>{item.fields.destinationComponent}</strong></p><p>Назначение: {item.fields.purpose}</p>{related(item, 'InteractionRevision').map(revision => <p className="ux-note" key={revision.id}>{revision.fields.traffic}</p>)}</div>)}<p className="ux-note">TCP/443 не подтверждает HTTPS; имя профиля не является доказательством L7.</p></div> : <p className="ux-summary">{object.summary}</p>}
        {subject && <SubjectSummary subject={subject} />}
        {object.kind === 'PolicyRule' && <p className="nid-warning">Наличие ACTIVE не означает работу сети. Маршрутизация, ACL и фактическая доступность требуют отдельного подтверждения.</p>}
        {object.id.startsWith('mock-simulation-rule-') && object.links.filter(l => l.label === 'Origin ALLOWED').map(l => <p key={l.id}><Link to={'/prototype/requests/' + l.id}>Вернуться к исходной заявке</Link></p>)}
        {object.kind === 'InteractionRevision' && <p className="ux-callout">Неизменяемость параметров — инвариант InteractionRevision, а не жизненное состояние.</p>}
        {object.kind === 'AccessRequest' && object.state === 'DENIED' && <Properties fields={{ policyRuleId: object.fields.policyRuleId }} />}
        <details><summary>О данных</summary><p>{natureLabel[dataNature[object.kind]]}. Все данные — mock в памяти; UI-ссылки не задают новые постоянные связи.</p></details>
      </div></section>
      <section className="ux-panel" aria-label="Основные свойства"><h2>{simulatedRequest ? 'Бизнес-основание и admission' : origin ? 'Состояние и происхождение Rule' : 'Основные свойства'}</h2><div className="ux-panel-body">
        {simulatedRequest && <><dl className="nid-summary">{related(object, 'ConnectivityNeed', 'BusinessProcess').map(o => <div key={o.id}><dt>{o.kind}</dt><dd><Link to={objectPath(o)}>{o.name}</Link></dd></div>)}<div><dt>Заявитель</dt><dd>{object.fields.requester}</dd></div><div><dt>Время подачи</dt><dd>{object.fields.submittedAt} (mock)</dd></div><div><dt>Допуск к подаче</dt><dd>{object.fields.RequestAuthorityEvidence}</dd></div></dl></>}
        {origin && <><dl className="nid-summary"><div><dt>PolicyRule</dt><dd>{object.name} · {object.state === 'Active' ? 'ACTIVE' : 'INACTIVE'}</dd></div><div><dt>Originating Request</dt><dd><Link to={objectPath(origin)}>{origin.name}</Link></dd></div><div><dt>Originating Decision</dt><dd>{origin.fields.decisionId} · ALLOWED</dd></div><div><dt>Decider</dt><dd>{origin.fields.decider}</dd></div><div><dt>Decided at</dt><dd>{origin.fields.decisionAt}</dd></div></dl><p className="ux-note">Origin не перезаписывается при повторном ALLOWED. Защищённый mock-просмотр предполагает policy.export на оба Resource.</p></>}
        {simulatedRequest || origin ? <details><summary>Технические идентификаторы</summary><Properties fields={{ id: object.id, ...object.fields }} /></details> : <Properties fields={{ id: object.id, ...Object.fromEntries(Object.entries(object.fields).filter(([key]) => !/Evidence|decision|decider|Authority/.test(key))) }} />}
      </div></section>
      {simulatedRequest && <SimulationActions key={object.id} object={object} />}
    </div> : <div className="ux-tab-content" key={object.id + selected.id}>
      {selected.note && <p className="ux-note">{selected.note}</p>}
      {selected.fields && <section className="ux-panel"><h2>{selected.title}</h2><div className="ux-panel-body"><Properties fields={selected.fields} /></div></section>}
      {selected.rows && <Collection label={selected.title} rows={selected.rows} columns={[c('name', 'Компонент'), c('summary', 'Контекст')]} />}
      {selected.objects && [...new Set(selected.objects.map(item => item.kind))].map(kind => <ObjectCollection key={kind} title={kind} parent={object} rows={selected.objects!.filter(item => item.kind === kind)} />)}
    </div>}
    {object.kind === 'InteractionRevision' && <SimulationActions object={object} />}
  </>
}
