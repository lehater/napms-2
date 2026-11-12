import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, message, type Client, type Need, type NeedOption, type NeedPage } from './api'
import { Button } from './components/ui/button'

function explain(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 409) return 'Такая потребность уже существует.'
    if (e.status === 400 || e.status === 422) return 'Выбранная коммуникация несовместима. Обновите варианты.'
    if (e.status === 404) return 'Процесс или коммуникация не найдены.'
  }
  return message(e)
}
export default function Needs({ client, processId }: { client: Client; processId: string }) {
  const [needs, setNeeds] = useState<NeedPage<Need> | null>(null)
  const [options, setOptions] = useState<NeedPage<NeedOption> | null>(null)
  const [offset, setOffset] = useState(0), [optionOffset, setOptionOffset] = useState(0)
  const [revision, setRevision] = useState(''), [error, setError] = useState(''), [optionError, setOptionError] = useState('')
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
      await client.createNeed(processId, revision)
      if (alive.current) { setFeedback('Потребность сохранена.'); setOffset(0); setOptionOffset(0); setReload(x => x + 1) }
    } catch (e) {
      if (alive.current) { setFeedback(explain(e)); if (e instanceof ApiError && e.status === 409) { setOptionOffset(0); setReload(x => x + 1) } }
    } finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section aria-label="Потребности REAL"><h2>Потребности</h2>
    <p>REAL · Потребность обосновывает коммуникацию и не разрешает доступ.</p>
    {error && <p role="alert">{error}</p>}
    {!needs && !error && <p role="status">Загрузка потребностей…</p>}
    {needs && <>{needs.items.length ? <div className="ux-table-scroll"><table className="ux-table"><thead><tr><th>Потребность</th><th>Interaction</th><th>Исходный Component</th></tr></thead><tbody>{needs.items.map(n => <tr key={n.connectivityNeedId}><td>{n.connectivityNeedId}</td><td>{n.interactionId}</td><td>{n.componentId}</td></tr>)}</tbody></table></div> : <p>На этой странице нет потребностей.</p>}
      <Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Предыдущие потребности</Button><Button variant="outline" disabled={!needs.hasMore} onClick={() => setOffset(offset + 20)}>Следующие потребности</Button></>}
    <h3>Создать потребность</h3>
    {optionError && <p role="alert">{optionError}</p>}
    {!options && !optionError && <p role="status">Загрузка коммуникаций…</p>}
    {options && <>{options.items.length ? <form className="process-form" onSubmit={submit}><label htmlFor="need-communication">Коммуникация</label><select id="need-communication" value={revision} disabled={busy} onChange={e => setRevision(e.target.value)} required><option value="">Выберите коммуникацию</option>{options.items.map(o => <option key={o.interactionRevisionId} value={o.interactionRevisionId}>{o.interactionId} · revision {o.interactionRevisionId} · Application {o.applicationId} · {o.sourceComponentId} → {o.destinationComponentId} · {o.ipProtocol} {o.destinationPortStart}–{o.destinationPortEnd}</option>)}</select><Button disabled={busy || !revision}>Создать потребность</Button></form> : <p>На этой странице нет доступных коммуникаций.</p>}
      <Button variant="outline" disabled={!optionOffset || busy} onClick={() => setOptionOffset(Math.max(0, optionOffset - 20))}>Предыдущие коммуникации</Button><Button variant="outline" disabled={!options.hasMore || busy} onClick={() => setOptionOffset(optionOffset + 20)}>Следующие коммуникации</Button></>}
    {feedback && <p role="status">{feedback}</p>}
    <Button variant="outline" disabled={busy} onClick={() => setReload(x => x + 1)}>Обновить потребности</Button>
  </section>
}
