import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { objectPath, type MockObject } from './data'
import { useSimulation } from './simulation'

export function SimulationActions({ object }: { object: MockObject }) {
  const simulation = useSimulation(), navigate = useNavigate()
  const [source, setSource] = useState('mock-deployment-order-2')
  const [destination, setDestination] = useState('mock-deployment-ledger')
  const [revision, setRevision] = useState(object.kind === 'InteractionRevision' ? object.id : 'mock-revision')
  const [error, setError] = useState(''), [decider, setDecider] = useState(false)
  const need = object.kind === 'ConnectivityNeed' ? object : simulation.objects.find(o => o.id === 'mock-need')!
  const deploymentOptions = simulation.objects.filter(o => o.kind === 'ComponentDeployment')
  const select = (label: string, value: string, change: (v: string) => void, options: readonly MockObject[]) => <label>{label}<select aria-label={label} value={value} onChange={e => change(e.target.value)}>{options.map(o => <option key={o.id} value={o.id}>{o.name} · {o.summary}</option>)}</select></label>
  const isRequest = object.id.startsWith('mock-simulation-request-')
  if (!['ConnectivityNeed', 'InteractionRevision'].includes(object.kind) && !isRequest) return null
  return <section className="ux-panel ux-panel-body" aria-label="MOCK Simulation"><h2>MOCK / Simulation</h2><p>Только состояние браузера. Полная перезагрузка сбрасывает симуляцию. Это не серверная авторизация.</p>
    {error && <p role="alert">{error}</p>}
    {!isRequest ? <form className="ux-tab-content" onSubmit={e => { e.preventDefault(); try { const id = simulation.create({ sourceDeploymentId: source, destinationDeploymentId: destination, interactionRevisionId: revision }, need.id); navigate(`/prototype/requests/${id}`) } catch (e) { setError((e as Error).message) } }}>
      <p>Основание: <Link to={objectPath(need)}>{need.name}</Link></p>
      {select('Источник', source, setSource, deploymentOptions)}
      {select('Получатель', destination, setDestination, deploymentOptions)}
      {select('Точная InteractionRevision', revision, setRevision, simulation.objects.filter(o => o.kind === 'InteractionRevision'))}
      <p>Выберите компоненты в направлении коммуникации. Ресурсы доступны в карточках участников.</p>
      <Button type="submit">Создать MOCK заявку</Button>
    </form> : object.state === 'PENDING' ? <><label><input type="checkbox" checked={decider} onChange={e => setDecider(e.target.checked)} /> MOCK режим принятия решения</label>{decider && <div>{(['ALLOWED', 'DENIED'] as const).map(outcome => <Button key={outcome} onClick={() => simulation.decision(object.id, outcome)}>{outcome}</Button>)}</div>}</> : <p>AccessDecision: {object.fields.decisionId} · {object.state} · {object.fields.decisionAt}. Решение завершено.</p>}
    {isRequest && object.links.filter(l => simulation.objects.find(o => o.id === l.id)?.kind === 'PolicyRule').map(l => <p key={l.id}><Link to={`/prototype/policy/${l.id}`}>Открыть PolicyRule</Link></p>)}
  </section>
}
