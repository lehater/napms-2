import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, message, type Client, type Need, type Options, type NeedOption, type DeploymentOption } from './api'
import { Button } from './components/ui/button'

type Option = NeedOption | DeploymentOption
const optionId = (option: Option) => 'interactionRevisionId' in option ? option.interactionRevisionId : option.deploymentId
const deployment = (option: Option | null) => option && 'deploymentId' in option ? option : null

function Selector({ client, need, kind, revision = '', value, choose }: { client: Client; need: Need; kind: Options['kind']; revision?: string; value: string; choose: (option: Option | null) => void }) {
  const [offset, setOffset] = useState(0), [reload, setReload] = useState(0)
  const [page, setPage] = useState<Options | null>(null), [error, setError] = useState('')
  const label = kind === 'revisions' ? 'Revision' : kind === 'source-deployments' ? 'Source Deployment' : 'Destination Deployment'
  useEffect(() => {
    let active = true
    setPage(null); setError(''); choose(null)
    client.requestOptions(need.processId, need.connectivityNeedId, kind, revision, offset).then(p => { if (active) setPage(p) }).catch(e => { if (active) setError(message(e)) })
    return () => { active = false }
    // Parent keys reset the selector on context changes; choose is intentionally a state callback.
  }, [client, need, kind, revision, offset, reload])
  return <div className="process-form"><label>{label}<select aria-label={label} value={value} disabled={!page} onChange={e => choose(page?.items.find(option => optionId(option) === e.target.value) ?? null)}><option value="">Выберите {label}</option>{page?.kind === 'revisions' ? page.items.map(o => <option key={o.interactionRevisionId} value={o.interactionRevisionId}>{o.interactionRevisionId} · {o.sourceComponentId} → {o.destinationComponentId} · {o.ipProtocol} {o.destinationPortStart}–{o.destinationPortEnd}</option>) : page?.items.map(o => <option key={o.deploymentId} value={o.deploymentId}>{o.deploymentId} · Component {o.componentId} · Resource {o.resourceId}</option>)}</select></label>
    {!page && !error && <p role="status">Загрузка {label}…</p>}{error && <p role="alert">{error}</p>}{page?.items.length === 0 && <p>На этой странице нет доступных вариантов.</p>}
    <Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Назад · {label}</Button><Button variant="outline" disabled={!page?.hasMore} onClick={() => setOffset(offset + 20)}>Далее · {label}</Button><Button variant="outline" onClick={() => setReload(x => x + 1)}>Обновить · {label}</Button>
    {value && page && <p>{page.kind === 'revisions' ? page.items.filter(o => o.interactionRevisionId === value).map(o => `${o.sourceComponentId} → ${o.destinationComponentId} · ${o.ipProtocol} ${o.destinationPortStart}–${o.destinationPortEnd}`).join('') : page.items.filter(o => o.deploymentId === value).map(o => `Component ${o.componentId} · Resource ${o.resourceId}`).join('')}</p>}
  </div>
}
export default function ComposeRequest({ client, need }: { client: Client; need: Need }) {
  const [revision, setRevision] = useState<NeedOption | null>(null), [source, setSource] = useState<DeploymentOption | null>(null), [destination, setDestination] = useState<DeploymentOption | null>(null)
  const [confirmation, setConfirmation] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [epoch, setEpoch] = useState(0)
  const alive = useRef(true), submitting = useRef(false), navigate = useNavigate()
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  function chooseRevision(option: Option | null) { setRevision(option && 'interactionRevisionId' in option ? option : null); setSource(null); setDestination(null); setConfirmation(false) }
  async function submit() {
    if (!confirmation || !revision || !source || !destination || submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try {
      const request = await client.create({ connectivityNeedId: need.connectivityNeedId, interactionRevisionId: revision.interactionRevisionId, sourceDeploymentId: source.deploymentId, destinationDeploymentId: destination.deploymentId })
      if (alive.current) navigate('/access-requests/' + request.requestId)
    } catch (e) {
      if (!alive.current) return
      setError(e instanceof ApiError ? message(e) : 'Результат отправки неизвестен. Проверьте список заявок перед новой отправкой.')
      chooseRevision(null); setEpoch(x => x + 1)
    } finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <section aria-label="Запрос из потребности"><h3>Запросить доступ</h3><p>Need {need.connectivityNeedId} · Interaction {need.interactionId} · Source Component {need.componentId}</p><p>PENDING не разрешает доступ; ALLOWED не доказывает сетевую доступность.</p>
    <fieldset disabled={busy}><Selector key={epoch} client={client} need={need} kind="revisions" value={revision?.interactionRevisionId ?? ''} choose={chooseRevision} />
      {revision && <><Selector key={'source' + revision.interactionRevisionId} client={client} need={need} kind="source-deployments" revision={revision.interactionRevisionId} value={source?.deploymentId ?? ''} choose={option => { setSource(deployment(option)); setConfirmation(false) }} /><Selector key={'destination' + revision.interactionRevisionId} client={client} need={need} kind="destination-deployments" revision={revision.interactionRevisionId} value={destination?.deploymentId ?? ''} choose={option => { setDestination(deployment(option)); setConfirmation(false) }} /></>}
      {revision && source && destination && <div role="group" aria-label="Сводка заявки"><h4>Сводка заявки</h4>
        <dl className="ux-properties">{Object.entries({
          'Need': need.connectivityNeedId,
          'Interaction': need.interactionId,
          'Revision': revision.interactionRevisionId,
          'Направление Components': `${revision.sourceComponentId} → ${revision.destinationComponentId}`,
          'Протокол': revision.ipProtocol,
          'Порты назначения': `${revision.destinationPortStart}–${revision.destinationPortEnd}`,
          'Source Deployment': source.deploymentId,
          'Source Resource': source.resourceId,
          'Destination Deployment': destination.deploymentId,
          'Destination Resource': destination.resourceId,
        }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><label><input type="checkbox" checked={confirmation} onChange={e => setConfirmation(e.target.checked)} />Подтверждаю состав заявки</label></div>}
      <Button disabled={!confirmation || busy} onClick={submit}>{busy ? 'Отправка…' : 'Подтвердить заявку'}</Button></fieldset>
    {error && <p role="alert">{error}</p>}<Link to="/access-requests">Проверить список заявок</Link>
  </section>
}
