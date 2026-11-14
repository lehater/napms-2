import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, message, type Client, type Application, type Component, type Interaction, type InteractionRevision, type TrafficClauseInput } from './api'
import { Button } from './components/ui/button'
import { DetailView } from './components/real/DetailView'
import { EntityTable } from './components/real/EntityTable'
import { ClauseFields, draftFromClause, emptyClause, parseClause, type ClauseDraft } from './TrafficClauseDraft'

const interactionPath = (applicationId: string, interactionId: string) =>
  `/applications/${applicationId}/interactions/${interactionId}`
const revisionsPath = (applicationId: string, interactionId: string) =>
  `${interactionPath(applicationId, interactionId)}?tab=revisions`
const revisionPath = (applicationId: string, interactionId: string, revisionId: string) =>
  `${interactionPath(applicationId, interactionId)}/revisions/${revisionId}`
const newRevisionPath = (applicationId: string, interactionId: string) =>
  `${interactionPath(applicationId, interactionId)}/revisions/new`

function catalogError(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.code === 'INTERACTION_PURPOSE_EXISTS') return 'Взаимодействие с таким назначением уже существует. Откройте его и создайте новую ревизию.'
    if (reason.code === 'DUPLICATE_INTERACTION') return 'Такое взаимодействие уже существует.'
    if (reason.code === 'DUPLICATE_TRAFFIC_CLAUSE' || reason.code === 'OVERLAPPING_TRAFFIC_CLAUSE')
      return 'Условия с одинаковым протоколом не должны дублироваться или пересекаться по портам.'
    if (reason.code === 'UNCHANGED_REVISION') return 'Набор условий не изменился. Новая ревизия не создана.'
    if (reason.status === 404) return 'Взаимодействие или ревизия не найдены.'
  }
  return message(reason)
}

function portRange(start: number | null, end: number | null) {
  return start === null || end === null ? 'ANY' : start === end ? String(start) : `${start}–${end}`
}

function ClauseEditor({ clauses, setClauses }: {
  clauses: ClauseDraft[]
  setClauses: (value: ClauseDraft[] | ((previous: ClauseDraft[]) => ClauseDraft[])) => void
}) {
  const change = (index: number, value: ClauseDraft) =>
    setClauses(items => items.map((item, i) => i === index ? value : item))
  const remove = (index: number) => setClauses(items => items.filter((_, i) => i !== index))
  return <section className="interaction-draft-clauses" aria-label="Черновик условий трафика">
    <header className="flex flex-wrap justify-between items-center gap-3">
      <h2>Условия трафика</h2>
      <Button type="button" variant="outline" disabled={clauses.length >= 32}
        onClick={() => setClauses(items => [...items, emptyClause()])}>Добавить условие</Button>
    </header>
    <p className="ux-note">Условия принадлежат создаваемой ревизии. Удаление здесь изменяет только черновик.</p>
    {clauses.map((clause, index) => <ClauseFields key={index} item={clause} index={index}
      change={value => change(index, value)} remove={() => remove(index)} />)}
    {!clauses.length && <p role="alert">Добавьте хотя бы одно условие для публикации.</p>}
  </section>
}

function parseSnapshot(clauses: ClauseDraft[]): TrafficClauseInput[] {
  if (!clauses.length) throw new Error('Ревизия должна содержать хотя бы одно условие трафика.')
  return clauses.map(parseClause)
}

async function allComponents(client: Client, applicationId: string): Promise<Component[]> {
  const items: Component[] = []
  let offset = 0
  for (;;) {
    const page = await client.components(applicationId, offset, 100)
    items.push(...page.items)
    if (!page.hasMore) return items
    offset += page.limit
  }
}

function InteractionBreadcrumbs({ applicationId, applicationName, interactionId, name, revision }: {
  applicationId: string
  applicationName: string
  interactionId?: string
  name?: string
  revision?: string
}) {
  return <><Link to="/">NAPMS</Link><span>/</span><Link to="/applications">Профили приложений</Link><span>/</span>
    <Link to={`/applications/${applicationId}?tab=interactions`}>{applicationName}</Link><span>/</span>
    {interactionId ? <Link to={interactionPath(applicationId, interactionId)}>{name}</Link>
      : <span aria-current="page">Создание взаимодействия</span>}
    {revision && <><span>/</span><span aria-current="page">{revision}</span></>}
  </>
}

function useInteraction(client: Client, applicationId: string, interactionId: string) {
  const [loaded, setLoaded] = useState<{ key: string; item: Interaction } | null>(null)
  const [failure, setFailure] = useState<{ key: string; text: string } | null>(null)
  const key = `${applicationId}/${interactionId}`
  useEffect(() => {
    let active = true
    setLoaded(null); setFailure(null)
    client.interaction(applicationId, interactionId)
      .then(item => { if (active) setLoaded({key, item}) })
      .catch(reason => { if (active) setFailure({key, text: catalogError(reason)}) })
    return () => { active = false }
  }, [client, applicationId, interactionId, key])
  return {item: loaded?.key === key ? loaded.item : null, error: failure?.key === key ? failure.text : ''}
}

export function InteractionCreateScreen({client}: {client: Client}) {
  const {applicationId = ''} = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState<Application | null>(null)
  const [components, setComponents] = useState<Component[]>([])
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [purpose, setPurpose] = useState('')
  const [clauses, setClauses] = useState<ClauseDraft[]>([emptyClause()])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    setApplication(null); setComponents([]); setError('')
    Promise.all([client.application(applicationId), allComponents(client, applicationId)])
      .then(([a, c]) => { if (active) { setApplication(a); setComponents(c) } })
      .catch(reason => { if (active) setError(catalogError(reason)) })
    return () => {active = false}
  }, [applicationId, client])
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    let trafficClauses: TrafficClauseInput[]
    try { trafficClauses = parseSnapshot(clauses) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Недопустимое условие'); return }
    setBusy(true)
    try {
      const created = await client.createInteraction(applicationId, {
        sourceComponentId: source, destinationComponentId: destination,
        purpose: purpose.trim(), trafficClauses,
      })
      navigate(interactionPath(applicationId, created.interactionId))
    } catch (reason) { setError(catalogError(reason)) }
    finally { setBusy(false) }
  }
  if (!application) return <section className="ux-panel ux-panel-body">
    {error ? <p role="alert">{error}</p> : <p role="status">Загрузка профиля приложения…</p>}
  </section>
  return <DetailView
    breadcrumbs={<InteractionBreadcrumbs applicationId={applicationId} applicationName={application.name} />}
    title="Создать взаимодействие"
    subtitle={<>Профиль: <Link to={`/applications/${applicationId}?tab=interactions`}>{application.name}</Link></>}
    tabs={[{id:'create',label:'Создание',href:`/applications/${applicationId}/interactions/new`}]}
    activeTab="create">
    <p>Взаимодействие описывает назначение связи и её участников. Первую ревизию с набором TrafficClause опубликуем одновременно с созданием.</p>
    {error && <p role="alert" className="ux-field-error">{error}</p>}
    <form className="interaction-draft-form" onSubmit={submit}>
      <section className="interaction-identity">
        <h2>Взаимодействие</h2>
        <label>Назначение взаимодействия
          <input aria-label="Назначение взаимодействия" required maxLength={300}
            value={purpose} placeholder="Например, синхронизация времени"
            onChange={event => setPurpose(event.target.value)} />
        </label>
        <div className="interaction-participants">
          <label>Источник<select required value={source} onChange={event => setSource(event.target.value)}>
            <option value="">Выберите компонент</option>
            {components.map(c => <option key={c.componentId} value={c.componentId}>{c.name}</option>)}
          </select></label>
          <label>Получатель<select required value={destination} onChange={event => setDestination(event.target.value)}>
            <option value="">Выберите компонент</option>
            {components.map(c => <option key={c.componentId} value={c.componentId}>{c.name}</option>)}
          </select></label>
        </div>
      </section>
      <section className="interaction-new-revision">
        <h2>Ревизия #1 · черновик</h2>
        <p className="ux-note">Опубликованная ревизия неизменяема. Её TrafficClause нельзя редактировать или удалять.</p>
        <ClauseEditor clauses={clauses} setClauses={setClauses}/>
      </section>
      <div className="interaction-draft-actions">
        <Button disabled={busy || !components.length || !clauses.length}>{busy ? 'Создание…' : 'Создать'}</Button>
        <Button type="button" variant="outline" asChild><Link to={`/applications/${applicationId}?tab=interactions`}>Отмена</Link></Button>
      </div>
    </form>
  </DetailView>
}

export function InteractionDetailScreen({client}: {client: Client}) {
  const {applicationId = '', interactionId = ''} = useParams()
  const [params] = useSearchParams()
  const tab = params.get('tab') === 'revisions' ? 'revisions' : 'overview'
  const {item, error} = useInteraction(client, applicationId, interactionId)
  if (!item) return <section className="ux-panel ux-panel-body">
    {error ? <p role="alert">{error}</p> : <p role="status">Загрузка взаимодействия…</p>}
  </section>
  const base = interactionPath(applicationId, interactionId)
  const latest = item.revisions.at(-1)!
  return <DetailView
    breadcrumbs={<InteractionBreadcrumbs applicationId={applicationId} applicationName={item.applicationName} interactionId={interactionId} name={item.purpose || `${item.sourceComponentName} → ${item.destinationComponentName}`} />}
    title={item.purpose || `${item.sourceComponentName} → ${item.destinationComponentName}`}
    subtitle={`${item.sourceComponentName} → ${item.destinationComponentName}`}
    actions={tab === 'revisions' ? <Button asChild><Link to={newRevisionPath(applicationId, interactionId)}>Создать ревизию</Link></Button> : undefined}
    tabs={[{id:'overview',label:'Обзор',href:base}, {id:'revisions',label:'Ревизии',href:`${base}?tab=revisions`}]}
    activeTab={tab}>
    {tab === 'overview' && <>
      <dl className="ux-properties">
        <div><dt>Назначение</dt><dd>{item.purpose || 'Не указано (историческая запись)'}</dd></div>
        <div><dt>Источник</dt><dd>{item.sourceComponentName}</dd></div>
        <div><dt>Получатель</dt><dd>{item.destinationComponentName}</dd></div>
        <div><dt>Последняя опубликованная ревизия</dt><dd>
          <Link to={revisionPath(applicationId, interactionId, latest.interactionRevisionId)}>#{latest.revisionNumber}</Link>
          {' · '}{latest.trafficClauses.length} условий
        </dd></div>
      </dl>
      <p className="ux-note">Изменения трафика создают новую ревизию. Предыдущие версии и связанные с ними заявки и правила сохраняются.</p>
    </>}
    {tab === 'revisions' && <>
      <p className="ux-note">Список опубликованных неизменяемых ревизий. Откройте версию для просмотра её TrafficClause.</p>
      <EntityTable<InteractionRevision> rows={item.revisions} columns={[
        {key:'number',title:'Ревизия',render:r=><Link to={revisionPath(applicationId, interactionId, r.interactionRevisionId)}>{`#${r.revisionNumber}`}</Link>},
        {key:'count',title:'Условий',render:r=>r.trafficClauses.length},
        {key:'summary',title:'Трафик',render:r=>r.trafficLabel},
        {key:'status',title:'Состояние',render:r=>'Опубликована · неизменяема'},
      ]} getKey={r=>r.interactionRevisionId} emptyText="Ревизий нет." />
    </>}
  </DetailView>
}

export function InteractionRevisionDetailScreen({client}: {client: Client}) {
  const {applicationId = '', interactionId = '', revisionId = ''} = useParams()
  const [params] = useSearchParams()
  const tab = params.get('tab') === 'clauses' ? 'clauses' : 'overview'
  const {item, error} = useInteraction(client, applicationId, interactionId)
  if (!item) return <section className="ux-panel ux-panel-body">
    {error ? <p role="alert">{error}</p> : <p role="status">Загрузка ревизии…</p>}
  </section>
  const revision = item.revisions.find(r => r.interactionRevisionId === revisionId)
  if (!revision) return <section className="ux-panel ux-panel-body"><p role="alert">Ревизия не найдена.</p>
    <Link to={revisionsPath(applicationId, interactionId)}>К списку ревизий</Link></section>
  const base = revisionPath(applicationId, interactionId, revisionId)
  return <DetailView
    breadcrumbs={<><InteractionBreadcrumbs applicationId={applicationId} applicationName={item.applicationName}
      interactionId={interactionId} name={item.purpose || `${item.sourceComponentName} → ${item.destinationComponentName}`}/>
      <span>/</span><span aria-current="page">Ревизия #{revision.revisionNumber}</span></>}
    title={`Ревизия #${revision.revisionNumber}`}
    subtitle={item.purpose || `${item.sourceComponentName} → ${item.destinationComponentName}`}
    state="Опубликована"
    tabs={[{id:'overview',label:'Обзор',href:base},
      {id:'clauses',label:'Условия трафика',href:`${base}?tab=clauses`}]}
    activeTab={tab}>
    {tab === 'overview' && <>
      <dl className="ux-properties">
        <div><dt>Взаимодействие</dt><dd><Link to={interactionPath(applicationId, interactionId)}>{item.purpose || 'Историческое взаимодействие'}</Link></dd></div>
        <div><dt>Номер версии</dt><dd>#{revision.revisionNumber}</dd></div>
        <div><dt>Состояние</dt><dd>Опубликована · неизменяема</dd></div>
        <div><dt>Количество TrafficClause</dt><dd>{revision.trafficClauses.length}</dd></div>
        <div><dt>Краткое описание трафика</dt><dd>{revision.trafficLabel}</dd></div>
        <div><dt>Revision ID</dt><dd><code>{revision.interactionRevisionId}</code></dd></div>
      </dl>
      <p className="ux-note">Редактирование и удаление опубликованной ревизии запрещены. Для изменения трафика создайте следующую ревизию на странице взаимодействия.</p>
      <Button asChild variant="outline"><Link to={`${base}?tab=clauses`}>Посмотреть условия трафика</Link></Button>
    </>}
    {tab === 'clauses' && <>
      <p className="ux-note">TrafficClause принадлежат только этой опубликованной ревизии; каждое условие сохранено в её неизменяемом снимке.</p>
      <EntityTable rows={revision.trafficClauses} columns={[
        {key:'index',title:'Условие',render:c=>`#${c.clauseIndex}`},
        {key:'protocol',title:'Протокол',render:c=>c.ipProtocol},
        {key:'source',title:'Порты источника',render:c=>portRange(c.sourcePortStart,c.sourcePortEnd)},
        {key:'destination',title:'Порты назначения',render:c=>portRange(c.destinationPortStart,c.destinationPortEnd)},
      ]} getKey={c=>String(c.clauseIndex)} emptyText="Условия трафика отсутствуют." />
    </>}
  </DetailView>
}

export function InteractionRevisionCreateScreen({client}: {client: Client}) {
  const {applicationId = '', interactionId = ''} = useParams()
  const navigate = useNavigate()
  const {item, error: loadError} = useInteraction(client, applicationId, interactionId)
  const [clauses, setClauses] = useState<ClauseDraft[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const latest = item?.revisions.at(-1)
  const revisionKey = latest ? `${interactionId}/${latest.interactionRevisionId}` : ''
  const [draftKey, setDraftKey] = useState('')
  useEffect(() => {
    if (latest && revisionKey !== draftKey) {
      setClauses(latest.trafficClauses.map(draftFromClause))
      setDraftKey(revisionKey)
    }
  }, [latest, revisionKey, draftKey])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!item || !latest || !clauses) return
    setError('')
    let trafficClauses: TrafficClauseInput[]
    try { trafficClauses = parseSnapshot(clauses) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Недопустимое условие'); return }
    setBusy(true)
    try {
      const result = await client.publishInteractionRevision(applicationId, interactionId, trafficClauses)
      const published = result.revisions.at(-1)!
      navigate(revisionPath(applicationId, interactionId, published.interactionRevisionId))
    } catch (reason) { setError(catalogError(reason)) }
    finally { setBusy(false) }
  }
  if (!item || !latest || !clauses) return <section className="ux-panel ux-panel-body">
    {loadError ? <p role="alert">{loadError}</p> : <p role="status">Загрузка черновика ревизии…</p>}
  </section>
  return <DetailView
    breadcrumbs={<><InteractionBreadcrumbs applicationId={applicationId} applicationName={item.applicationName}
      interactionId={interactionId} name={item.purpose || `${item.sourceComponentName} → ${item.destinationComponentName}`}/>
      <span>/</span><span aria-current="page">Новая ревизия</span></>}
    title={`Новая ревизия #${latest.revisionNumber + 1}`}
    subtitle={item.purpose || `${item.sourceComponentName} → ${item.destinationComponentName}`}
    tabs={[{id:'draft',label:'Черновик ревизии',href:newRevisionPath(applicationId, interactionId)}]}
    activeTab="draft">
    <p>Черновик создан из Revision #{latest.revisionNumber}. Изменения не сохраняются до публикации.</p>
    {error && <p role="alert" className="ux-field-error">{error}</p>}
    <form className="interaction-draft-form" onSubmit={submit}>
      <ClauseEditor clauses={clauses} setClauses={setClauses}/>
      <div className="interaction-draft-actions">
        <Button disabled={busy || clauses.length === 0}>{busy ? 'Публикация…' : 'Опубликовать'}</Button>
        <Button type="button" variant="outline" asChild><Link to={revisionsPath(applicationId, interactionId)}>Отмена</Link></Button>
      </div>
    </form>
  </DetailView>
}
