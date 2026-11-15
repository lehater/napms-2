import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, message, type Client, type Need, type NeedDetail as NeedDetailData, type NeedOption, type NeedPage } from './api'
import ComposeRequest from './ComposeRequest'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { EntityTable } from './components/real/EntityTable'
import { DetailView } from './components/real/DetailView'
import ErrorNotice from './components/ErrorNotice'
import { formatDate } from './lib/format'

function explain(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 409 && e.code === 'NEED_RETIRED') return 'Потребность выведена из действия и не принимает новые заявки.'
    if (e.status === 409 && e.code === 'DUPLICATE_NEED') return 'Такая потребность уже существует. Откройте её и восстановите эту запись.'
    if (e.status === 409) return 'Операция недоступна для текущего состояния процесса или потребности.'
    if (e.status === 400 || e.status === 422) return 'Выбранная коммуникация несовместима. Обновите варианты.'
    if (e.status === 404) return 'Процесс или коммуникация не найдены.'
  }
  return message(e)
}
export default function Needs({ client, processId, archived = false }: { client: Client; processId: string; archived?: boolean }) {
  const [needs, setNeeds] = useState<NeedPage<Need> | null>(null)
  const [options, setOptions] = useState<NeedPage<NeedOption> | null>(null)
  const [basis, setBasis] = useState('')
  const [offset, setOffset] = useState(0), [optionOffset, setOptionOffset] = useState(0)
  const [revision, setRevision] = useState(''), [error, setError] = useState(''), [optionError, setOptionError] = useState('')
  const selectedOption = options?.items.find(option => option.interactionRevisionId === revision)
  const [reload, setReload] = useState(0), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('')
  const submitting = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setNeeds(null); setError('')
    client.needs(processId, offset).then(p => { if (active) setNeeds(p) }).catch(e => { if (active) setError(explain(e)) })
    return () => { active = false }
  }, [client, processId, offset, reload])
  useEffect(() => {
    let active = true
    setOptions(null); setRevision(''); setOptionError('')
    client.needOptions(processId, optionOffset).then(p => { if (active) setOptions(p) }).catch(e => { if (active) setOptionError(explain(e)) })
    return () => { active = false }
  }, [client, processId, optionOffset, reload])
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!revision || submitting.current) return
    submitting.current = true; setBusy(true); setFeedback('')
    try {
      await client.createNeed(processId, revision, basis)
      if (alive.current) { setFeedback('Потребность сохранена.'); setBasis(''); setOffset(0); setOptionOffset(0); setReload(x => x + 1) }
    } catch (e) {
      if (alive.current) { setFeedback(explain(e)); if (e instanceof ApiError && e.status === 409) { setOptionOffset(0); setReload(x => x + 1) } }
    } finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <div className="ux-tab-content"><section aria-label="Потребности процесса" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex-1">Сохранённые потребности</h2>
      <Button variant="outline" disabled={busy} onClick={() => setReload(x => x + 1)}>Обновить потребности</Button>
    </div>
    <p className="ux-note">Потребность обосновывает коммуникацию и не разрешает доступ. Выберите сохранённую потребность, чтобы оформить заявку.</p>
    <EntityTable<Need> rows={needs?.items ?? []} columns={[
      {key:'need',title:'Потребность',render:n=><Link to={`/business-processes/${processId}/needs/${n.connectivityNeedId}`}>{n.displayLabel}<small>{n.connectivityNeedId}</small></Link>},
      {key:'interaction',title:'Взаимодействие',render:n=>n.interactionId},
      {key:'component',title:'Исходный компонент',render:n=>n.componentId},
      {key:'status',title:'Статус',render:n=><Badge variant="outline">{n.status === 'ACTIVE' ? 'Активна' : 'Выведена'}</Badge>},
    ]} getKey={n=>n.connectivityNeedId} emptyText="Для этого бизнес-процесса пока нет потребностей." loading={!needs && !error} error={error} />
    {needs && (offset > 0 || needs.hasMore) && <div className="flex flex-wrap gap-2">
      {offset > 0 && <Button variant="outline" onClick={() => setOffset(Math.max(0, offset - 20))}>Предыдущие потребности</Button>}
      {needs.hasMore && <Button variant="outline" onClick={() => setOffset(offset + 20)}>Следующие потребности</Button>}
    </div>}
    </section>{archived ? <p className="ux-callout" role="status">Процесс архивирован. Существующие потребности доступны для просмотра; новые создавать нельзя.</p> : <section aria-label="Создание потребности" className="space-y-3"><h2>Создание потребности</h2>
    <ErrorNotice text={optionError} />
    {!options && !optionError && <p role="status">Загрузка коммуникаций…</p>}
    {options && <>{options.items.length ? <form className="process-form" onSubmit={submit}><label htmlFor="need-communication">Коммуникация</label><select id="need-communication" value={revision} disabled={busy} onChange={e => setRevision(e.target.value)} required><option value="">Выберите коммуникацию</option>{options.items.map(o => <option key={o.interactionRevisionId} value={o.interactionRevisionId}>{o.displayLabel} · {o.trafficLabel} · Revision {o.interactionRevisionId}</option>)}</select>
      <label htmlFor="need-basis">Обоснование потребности</label><textarea id="need-basis" value={basis} maxLength={10000} required disabled={busy} onChange={e => setBasis(e.target.value)} />
      {selectedOption && <dl className="ux-properties ux-choice-facts">{Object.entries({ 'Коммуникация': selectedOption.displayLabel, 'Трафик выбранной ревизии': selectedOption.trafficLabel, 'Исходный Component': selectedOption.sourceComponentId, 'Целевой Component': selectedOption.destinationComponentId }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <Button disabled={busy || !revision || !basis.trim()}>Создать потребность</Button></form> : <div className="ux-callout" role="status">
        <p>На этой странице нет доступных коммуникаций.</p>
        <p>Проверьте взаимодействия и ревизии в <Link to="/applications">профилях приложений</Link>. После изменений обновите список потребностей.</p>
      </div>}
      {(optionOffset > 0 || options.hasMore) && <div className="flex flex-wrap gap-2">
        {optionOffset > 0 && <Button variant="outline" disabled={busy} onClick={() => setOptionOffset(Math.max(0, optionOffset - 20))}>Предыдущие коммуникации</Button>}
        {options.hasMore && <Button variant="outline" disabled={busy} onClick={() => setOptionOffset(optionOffset + 20)}>Следующие коммуникации</Button>}
      </div>}</>}
    {feedback && <p role="status">{feedback}</p>}
    </section>}</div>
}

export function NeedDetailScreen({ client }: { client: Client }) {
  const { processId = '', needId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const rawOffset = Number(params.get('offset') ?? 0)
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const requestsTab = params.get('tab') === 'requests'
  const [item, setItem] = useState<NeedDetailData | null>(null)
  const [error, setError] = useState(''), [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [reload, setReload] = useState(0)
  const base = `/business-processes/${encodeURIComponent(processId)}/needs/${encodeURIComponent(needId)}`
  const href = (tab: string, pageOffset = 0) => {
    const query = new URLSearchParams()
    if (tab !== 'overview') query.set('tab', tab)
    if (pageOffset) query.set('offset', String(pageOffset))
    return base + (query.size ? `?${query}` : '')
  }
  useEffect(() => {
    let active = true
    setItem(null); setError('')
    client.need(processId, needId, offset).then(value => { if (active) setItem(value) })
      .catch(reason => { if (active) setError(explain(reason)) })
    return () => { active = false }
  }, [client, processId, needId, offset, reload])

  async function saveBasis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setActionError('')
    try {
      await client.updateNeed(processId, needId, String(form.get('businessBasis') ?? ''))
      setEditing(false); setReload(value => value + 1)
    } catch (reason) { setActionError(explain(reason)) }
    finally { setBusy(false) }
  }

  async function changeStatus(status: Need['status']) {
    if (busy || !item) return
    const verb = status === 'RETIRED' ? 'Вывести из действия' : 'Восстановить'
    if (!window.confirm(`${verb} потребность «${item.displayLabel}»?`)) return
    setBusy(true); setActionError('')
    try { await client.setNeedStatus(processId, needId, status); setReload(value => value + 1) }
    catch (reason) { setActionError(explain(reason)) }
    finally { setBusy(false) }
  }

  if (!item || item.connectivityNeedId !== needId) return <section className="ux-panel ux-panel-body">
    <ErrorNotice text={error} retry={() => setReload(value => value + 1)} />
    {!error && <p role="status">Загрузка потребности…</p>}
  </section>

  const processPath = `/business-processes/${encodeURIComponent(processId)}?tab=needs`
  const interactionPath = item.interaction.applicationId
    ? `/applications/${encodeURIComponent(item.interaction.applicationId)}/interactions/${encodeURIComponent(item.interaction.interactionId)}`
    : null
  const actions = <>
    <Button variant="outline" disabled={busy} onClick={() => { setEditing(value => !value); setActionError('') }}>
      {editing ? 'Отменить редактирование' : 'Изменить обоснование'}
    </Button>
    {item.status === 'ACTIVE'
      ? <Button variant="outline" disabled={busy} onClick={() => void changeStatus('RETIRED')}>Вывести из действия</Button>
      : <Button disabled={busy || item.process.status !== 'ACTIVE'} onClick={() => void changeStatus('ACTIVE')}>Восстановить</Button>}
  </>
  const requests = item.requests
  const updateOffset = (value: number) => setParams({ tab: 'requests', ...(value ? { offset: String(value) } : {}) })

  return <DetailView
    breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to="/business-processes">Бизнес-процессы</Link><span>/</span><Link to={processPath}>{item.process.name ?? 'Бизнес-процесс'}</Link><span>/</span><span aria-current="page">{item.displayLabel}</span></>}
    title={item.displayLabel}
    subtitle={<Link to={processPath}>{item.process.name ?? 'Бизнес-процесс'} · открыть процесс</Link>}
    state={item.status === 'ACTIVE' ? 'Активна' : 'Выведена'} actions={actions}
    tabs={[{ id: 'overview', label: 'Обзор', href: href('overview') }, { id: 'requests', label: 'Заявки', href: href('requests') }]}
    activeTab={requestsTab ? 'requests' : 'overview'}>
    <ErrorNotice text={actionError} />
    {!requestsTab ? <div className="space-y-4">
      {editing && <form className="process-form" onSubmit={saveBasis}>
        <label htmlFor="edit-need-basis">Обоснование потребности</label>
        <textarea id="edit-need-basis" name="businessBasis" required minLength={1} maxLength={10000} defaultValue={item.businessBasis ?? ''} disabled={busy} />
        <Button disabled={busy}>Сохранить обоснование</Button>
      </form>}
      <dl className="ux-properties">
        <div><dt>Бизнес-процесс</dt><dd><Link to={processPath}>{item.process.name ?? item.process.processId}</Link><small>{item.process.status === 'ACTIVE' ? 'Активен' : 'Архивирован'}</small></dd></div>
        <div><dt>Взаимодействие</dt><dd>{interactionPath ? <Link to={interactionPath}>{item.interaction.name}</Link> : item.interaction.name}<small>{item.interaction.interactionId}</small></dd></div>
        <div><dt>Участник · исходный компонент</dt><dd>{item.participant.name}<small>{item.participant.componentId}</small></dd></div>
        <div><dt>Обоснование</dt><dd>{item.businessBasis ?? 'Не заполнено для исторической потребности'}</dd></div>
        <div><dt>Статус потребности</dt><dd>{item.status === 'ACTIVE' ? 'Активна' : 'Выведена из действия'}</dd></div>
      </dl>
      {item.status === 'RETIRED' && <p className="ux-callout" role="status">Потребность выведена из действия. Существующая история доступна для просмотра; новые заявки создавать нельзя.</p>}
      {item.status === 'ACTIVE' && item.process.status === 'ARCHIVED' && <p className="ux-callout" role="status">Процесс архивирован. Новые заявки недоступны, пока процесс не восстановлен.</p>}
      {item.status === 'RETIRED' && item.process.status === 'ARCHIVED' && <p className="ux-note" role="status">Сначала восстановите бизнес-процесс, затем эту потребность.</p>}
      {item.status === 'ACTIVE' && item.process.status === 'ACTIVE' && <ComposeRequest key={item.connectivityNeedId} client={client} need={item} />}
    </div> : <section aria-label="Заявки потребности" className="space-y-3">
      <h2>Связанные заявки</h2>
      <p className="ux-note">История заявок сохраняется после вывода потребности из действия.</p>
      <EntityTable<NeedDetailData['requests']['items'][number]> rows={requests.items} columns={[
        { key: 'request', title: 'Заявка', render: request => <Link to={`/access-requests/${request.requestId}`}>{request.requestId}</Link> },
        { key: 'submittedAt', title: 'Подана', render: request => formatDate(request.submittedAt) },
        { key: 'status', title: 'Статус', render: request => <Badge variant="outline">{request.status}</Badge> },
      ]} getKey={request => request.requestId} emptyText="Нет доступных связанных заявок." />
      {(requests.offset > 0 || requests.hasMore) && <div className="flex flex-wrap gap-2">
        {requests.offset > 0 && <Button variant="outline" onClick={() => updateOffset(Math.max(0, requests.offset - requests.limit))}>Предыдущие заявки</Button>}
        {requests.hasMore && <Button variant="outline" onClick={() => updateOffset(requests.offset + requests.limit)}>Следующие заявки</Button>}
      </div>}
    </section>}
  </DetailView>
}
