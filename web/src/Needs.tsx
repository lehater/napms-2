import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, message, type Client, type Need, type NeedOption, type NeedPage } from './api'
import { Button } from './components/ui/button'
import ErrorNotice from './components/ErrorNotice'

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
  const selected = options?.items.find(o => o.interactionRevisionId === revision)
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
    <section className="ux-needs-block" aria-label="Сохранённые потребности"><h3>Сохранённые потребности</h3>
    <ErrorNotice text={error} />
    {!needs && !error && <p role="status">Загрузка потребностей…</p>}
    {needs && <>{needs.items.length ? <div className="ux-table-scroll"><table className="ux-table"><thead><tr><th>Потребность</th><th>Interaction</th><th>Исходный Component</th></tr></thead><tbody>{needs.items.map(n => <tr key={n.connectivityNeedId}><td>{n.connectivityNeedId}</td><td>{n.interactionId}</td><td>{n.componentId}</td></tr>)}</tbody></table></div> : <p>На этой странице нет потребностей.</p>}
      <div className="ux-actions"><Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Предыдущие потребности</Button><Button variant="outline" disabled={!needs.hasMore} onClick={() => setOffset(offset + 20)}>Следующие потребности</Button></div></>}
    {Boolean(needs?.items.length) && <p className="ux-note">Потребности сохранены. Составление заявки из выбранной потребности пока недоступно; раздел «Заявки на доступ» содержит техническую форму по идентификаторам.</p>}
    </section>
    <section className="ux-needs-block" aria-label="Создание потребности">
    <h3>Создать потребность</h3>
    <ErrorNotice text={optionError} />
    {!options && !optionError && <p role="status">Загрузка коммуникаций…</p>}
    {options && <>{options.items.length ? <form className="process-form" onSubmit={submit}><label htmlFor="need-communication">Коммуникация</label><select id="need-communication" value={revision} disabled={busy} onChange={e => setRevision(e.target.value)} required aria-describedby="need-selection-help"><option value="">Выберите коммуникацию</option>{options.items.map((o, i) => <option key={o.interactionRevisionId} value={o.interactionRevisionId}>Вариант {optionOffset + i + 1} · {o.ipProtocol} {o.destinationPortStart}–{o.destinationPortEnd} · ревизия {o.interactionRevisionId}</option>)}</select>
      <p className="ux-note" id="need-selection-help">Названия коммуникаций в каталоге пока отсутствуют. Ревизия помогает выбрать устойчивую коммуникацию; её трафик не становится свойством потребности.</p>
      {selected && <dl className="ux-properties ux-choice-facts">{Object.entries({ 'Коммуникация': selected.interactionId, 'Профиль приложения': selected.applicationId, 'Исходный компонент': selected.sourceComponentId, 'Целевой компонент': selected.destinationComponentId, 'Трафик выбранной ревизии': `${selected.ipProtocol} · порты назначения ${selected.destinationPortStart}–${selected.destinationPortEnd}` }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <Button disabled={busy || !revision}>Создать потребность</Button></form> : <p>На этой странице нет доступных коммуникаций.</p>}
      <div className="ux-actions"><Button variant="outline" disabled={!optionOffset || busy} onClick={() => setOptionOffset(Math.max(0, optionOffset - 20))}>Предыдущие коммуникации</Button><Button variant="outline" disabled={!options.hasMore || busy} onClick={() => setOptionOffset(optionOffset + 20)}>Следующие коммуникации</Button></div></>}
    {feedback && <p role="status">{feedback}</p>}
    </section>
    <div className="ux-actions"><Button variant="outline" disabled={busy} onClick={() => setReload(x => x + 1)}>Обновить потребности</Button></div>
  </section>
}
