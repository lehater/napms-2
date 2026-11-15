import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, message, type Client, type Need, type NeedOption, type NeedPage } from './api'
import ComposeRequest from './ComposeRequest'
import { Button } from './components/ui/button'
import { EntityTable } from './components/real/EntityTable'
import ErrorNotice from './components/ErrorNotice'

function explain(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 409) return 'Такая потребность уже существует.'
    if (e.status === 400 || e.status === 422) return 'Выбранная коммуникация несовместима. Обновите варианты.'
    if (e.status === 404) return 'Процесс или коммуникация не найдены.'
  }
  return message(e)
}
export default function Needs({ client, processId, archived = false }: { client: Client; processId: string; archived?: boolean }) {
  const [selected, setSelected] = useState<Need | null>(null)
  const [needs, setNeeds] = useState<NeedPage<Need> | null>(null)
  const [options, setOptions] = useState<NeedPage<NeedOption> | null>(null)
  const [offset, setOffset] = useState(0), [optionOffset, setOptionOffset] = useState(0)
  const [revision, setRevision] = useState(''), [error, setError] = useState(''), [optionError, setOptionError] = useState('')
  const selectedOption = options?.items.find(option => option.interactionRevisionId === revision)
  const [reload, setReload] = useState(0), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('')
  const submitting = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    setSelected(null); setNeeds(null); setError('')
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
      await client.createNeed(processId, revision)
      if (alive.current) { setFeedback('Потребность сохранена.'); setOffset(0); setOptionOffset(0); setReload(x => x + 1) }
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
      {key:'need',title:'Потребность',render:n=><button aria-pressed={selected?.connectivityNeedId === n.connectivityNeedId} onClick={() => setSelected(n)}>{n.displayLabel}<small>{n.connectivityNeedId}</small></button>},
      {key:'interaction',title:'Взаимодействие',render:n=>n.interactionId},
      {key:'component',title:'Исходный компонент',render:n=>n.componentId},
    ]} getKey={n=>n.connectivityNeedId} emptyText="Для этого бизнес-процесса пока нет потребностей." loading={!needs && !error} error={error} />
    {needs && (offset > 0 || needs.hasMore) && <div className="flex flex-wrap gap-2">
      {offset > 0 && <Button variant="outline" onClick={() => setOffset(Math.max(0, offset - 20))}>Предыдущие потребности</Button>}
      {needs.hasMore && <Button variant="outline" onClick={() => setOffset(offset + 20)}>Следующие потребности</Button>}
    </div>}
    {selected && !archived && <ComposeRequest key={selected.connectivityNeedId} client={client} need={selected} />}
    {selected && archived && <p className="ux-note" role="status">Процесс архивирован: новые заявки недоступны.</p>}
    </section>{archived ? <p className="ux-callout" role="status">Процесс архивирован. Существующие потребности доступны для просмотра; новые создавать нельзя.</p> : <section aria-label="Создание потребности" className="space-y-3"><h2>Создание потребности</h2>
    <ErrorNotice text={optionError} />
    {!options && !optionError && <p role="status">Загрузка коммуникаций…</p>}
    {options && <>{options.items.length ? <form className="process-form" onSubmit={submit}><label htmlFor="need-communication">Коммуникация</label><select id="need-communication" value={revision} disabled={busy} onChange={e => setRevision(e.target.value)} required><option value="">Выберите коммуникацию</option>{options.items.map(o => <option key={o.interactionRevisionId} value={o.interactionRevisionId}>{o.displayLabel} · {o.trafficLabel} · Revision {o.interactionRevisionId}</option>)}</select>
      {selectedOption && <dl className="ux-properties ux-choice-facts">{Object.entries({ 'Коммуникация': selectedOption.displayLabel, 'Трафик выбранной ревизии': selectedOption.trafficLabel, 'Исходный Component': selectedOption.sourceComponentId, 'Целевой Component': selectedOption.destinationComponentId }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <Button disabled={busy || !revision}>Создать потребность</Button></form> : <div className="ux-callout" role="status">
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
