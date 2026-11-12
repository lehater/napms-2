import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { type MockObject } from './data'
import { subjectLabel, subjectOf, useSimulation, type Outcome } from './simulation'

export function SimulationActions({ object }: { object: MockObject }) {
  const simulation = useSimulation()
  const [selected, setSelected] = useState<Outcome | null>(null), [error, setError] = useState('')
  useEffect(() => { setSelected(null); setError('') }, [simulation.role, object.id])
  const isRequest = object.id.startsWith('mock-simulation-request-')
  if (object.kind === 'InteractionRevision') return <p className="ux-callout"><Link to="/prototype/needs/mock-need?tab=communication">Составить заявку по ConnectivityNeed →</Link></p>
  if (!isRequest) return null
  const pending = object.state === 'PENDING', decider = simulation.role === 'Decider'
  return <section className="ux-panel" aria-label="MOCK Simulation"><h2>{pending ? 'Рассмотрение · Decider' : 'Сохранённое решение'}</h2><div className="ux-panel-body">
    <div className={object.state === 'DENIED' ? 'nid-warning' : pending ? 'nid-notice nid-pending' : 'nid-notice'}><strong>{pending ? 'PENDING — решение ещё не принято' : object.state + ' — терминальное решение'}</strong><p>{pending ? 'Заявка ожидает независимого решения.' : 'Повторное решение недоступно. Исходы ALLOWED и DENIED взаимоисключающие.'}</p></div>
    {error && <p role="alert">{error}</p>}
    {pending ? <>
      <label className="nid-decision-mode"><input type="checkbox" checked={decider} onChange={e => simulation.setRole(e.target.checked ? 'Decider' : 'Requester')} /> MOCK режим принятия решения</label>
      <p className="ux-note">Только Decider с отдельным access.decide может принять решение. Переключение роли — симуляция, не серверная авторизация.</p>
      {decider ? <>
        <fieldset className="nid-decision-choices"><legend>Выберите ровно одно решение</legend>{(['ALLOWED', 'DENIED'] as const).map(outcome => <label key={outcome} data-selected={selected === outcome}><span>{outcome}<input type="radio" aria-label={outcome} name="mock-decision" value={outcome} checked={selected === outcome} onChange={() => { setSelected(outcome); setError('') }} /></span><small>{outcome === 'ALLOWED' ? 'Разрешить точный subject; создать или переиспользовать Rule.' : 'Отклонить эту заявку; не создавать и не отзывать Rule.'}</small></label>)}</fieldset>
        {selected ? <div className="nid-confirmation" role="dialog" aria-label={'Подтверждение ' + selected}><h3>Подтвердить {selected} для {object.name}?</h3><code>{subjectLabel(subjectOf(object)!)}</code><p>{selected === 'ALLOWED' ? 'Будет создан или переиспользован канонический Rule. INACTIVE Rule не реактивируется. Это не подтверждает работу сети.' : 'Новый Rule не создаётся. Существующие правила, включая P1, не отзываются.'}</p><Button variant="outline" onClick={() => setSelected(null)}>Отменить выбор</Button><Button onClick={() => { try { simulation.decision(object.id, selected); setSelected(null) } catch (e) { setError((e as Error).message) } }}>Подтвердить {selected}</Button></div> : <div className="nid-confirmation"><h3>Решение не выбрано</h3><p>Выберите ALLOWED или DENIED, затем отдельно подтвердите конкретный исход.</p><Button disabled>Подтвердить решение</Button></div>}
      </> : <p>Requester наблюдает за своей заявкой; Policy Viewer читает разрешения. Эти роли не принимают решение.</p>}
    </> : <>
      <dl className="ux-properties">{Object.entries({ Decision: object.fields.decisionId, Decider: object.fields.decider, 'Дата решения': object.fields.decisionAt, 'PolicyRule ID': object.fields.policyRuleId }).map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p>Решение завершено.</p>{object.state === 'DENIED' && <p className="nid-warning">Разрешение по этой заявке не появилось. DENIED не создаёт PolicyRule и не отзывает существующие правила.</p>}
    </>}
    {object.links.filter(l => simulation.objects.find(o => o.id === l.id)?.kind === 'PolicyRule').map(l => <p className="nid-rule-result" key={l.id}><Link to={'/prototype/policy/' + l.id}>Открыть PolicyRule</Link><small>MOCK разрешённый просмотр: policy.export на оба Resource. Право видеть заявку само по себе не предоставляет это право.</small></p>)}
    <p className="ux-note">ALLOWED / ACTIVE — декларированное разрешение. Конфигурация устройств и фактическая сетевая доступность не подтверждены.</p>
    <Link to="/prototype/requests">← К заявкам на доступ</Link>
  </div></section>
}
