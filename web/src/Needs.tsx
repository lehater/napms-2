import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, message, type Client, type Need, type NeedOption, type NeedPage } from './api'
import ComposeRequest from './ComposeRequest'
import { Button } from './components/ui/button'
import { EntityTable } from './components/real/EntityTable'

function explain(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 409) return 'Такая потребность уже существует.'
    if (e.status === 400 || e.status === 422) return 'Выбранная коммуникация несовместима. Обновите варианты.'
    if (e.status === 404) return 'Процесс или коммуникация не найдены.'
  }
  return message(e)
}
export default function Needs({ client, processId }: { client: Client; processId: string }) {
  const [selected, setSelected] = useState<Need | null>(null)
  const [needs, setNeeds] = useState<NeedPage<Need> | null>(null)
  const [options, setOptions] = useState<NeedPage<NeedOption> | null>(null)
  const [offset, setOffset] = useState(0), [optionOffset, setOptionOffset] = useState(0)
  const [revision, setRevision] = useState(''), [error, setError] = useState(''), [optionError, setOptionError] = useState('')
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
  return <section aria-label="Потребности процесса"><h2>Потребности</h2>
    <p>Потребность обосновывает коммуникацию и не разрешает доступ.</p>
    <EntityTable<Need> rows={needs?.items ?? []} columns={[
      {key:'need',title:'Потребность',render:n=><button aria-pressed={selected?.connectivityNeedId === n.connectivityNeedId} onClick={() => setSelected(n)}>{n.displayLabel}<small>{n.connectivityNeedId}</small></button>},
      {key:'interaction',title:'Interaction',render:n=>n.interactionId},
      {key:'component',title:'Исходный Component',render:n=>n.componentId},
    ]} getKey={n=>n.connectivityNeedId} emptyText="На этой странице нет потребностей" loading={!needs && !error} error={error} />
    {needs && <>
      <Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Предыдущие потребности</Button><Button variant="outline" disabled={!needs.hasMore} onClick={() => setOffset(offset + 20)}>Следующие потребности</Button></>}
    {selected && <ComposeRequest key={selected.connectivityNeedId} client={client} need={selected} />}
    <h3>Создать потребность</h3>
    {optionError && <p role="alert">{optionError}</p>}
    {!options && !optionError && <p role="status">Загрузка коммуникаций…</p>}
    {options && <>{options.items.length ? <form className="process-form" onSubmit={submit}><label htmlFor="need-communication">Коммуникация</label><select id="need-communication" value={revision} disabled={busy} onChange={e => setRevision(e.target.value)} required><option value="">Выберите коммуникацию</option>{options.items.map(o => <option key={o.interactionRevisionId} value={o.interactionRevisionId}>{o.displayLabel} · ID {o.interactionRevisionId}</option>)}</select><Button disabled={busy || !revision}>Создать потребность</Button></form> : <p>На этой странице нет доступных коммуникаций.</p>}
      <Button variant="outline" disabled={!optionOffset || busy} onClick={() => setOptionOffset(Math.max(0, optionOffset - 20))}>Предыдущие коммуникации</Button><Button variant="outline" disabled={!options.hasMore || busy} onClick={() => setOptionOffset(optionOffset + 20)}>Следующие коммуникации</Button></>}
    {feedback && <p role="status">{feedback}</p>}
    <Button variant="outline" disabled={busy} onClick={() => setReload(x => x + 1)}>Обновить потребности</Button>
  </section>
}
