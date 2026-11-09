import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { objectPath, type MockObject } from './data'
import { newSubject, originalSubject, subjectKey, subjectLabel, subjectOf, useSimulation, validateSubject, type Scenario, type Subject } from './simulation'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ux-panel" aria-label={title}><h2>{title}</h2><div className="ux-panel-body">{children}</div></section>
}

export function SubjectSummary({ subject }: { subject: Subject }) {
  const { objects } = useSimulation()
  const get = (id: string) => objects.find(o => o.id === id)
  const source = get(subject.sourceDeploymentId), destination = get(subject.destinationDeploymentId), revision = get(subject.interactionRevisionId)
  return <div className="nid-subject" aria-label="Exact AccessSubject">
    <p className="ux-eyebrow">Exact AccessSubject · упорядоченная тройка</p><code>{subjectLabel(subject)}</code>
    <div className="nid-direction"><div><small>SOURCE · {source?.fields.component}</small>{source && <Link to={objectPath(source)}>{source.name}</Link>}<p>{source?.summary}</p></div><span aria-label="Направление коммуникации">→</span><div><small>DESTINATION · {destination?.fields.component}</small>{destination ? <><Link to={objectPath(destination)}>{destination.name}</Link><p>{destination.summary}</p></> : <p>Не выбрано</p>}</div></div>
    <p>{revision && <Link to={objectPath(revision)}>{revision.name}</Link>}{revision?.fields.traffic} · параметры Revision неизменяемы</p>
    <p className="ux-note">Need и IP-адреса не входят в identity AccessSubject.</p>
  </div>
}

export function NeedCommunication({ object, scenario }: { object: MockObject; scenario: Scenario }) {
  const simulation = useSimulation(), navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [subject, setSubject] = useState<Subject>({ ...(scenario === 'B' ? originalSubject : newSubject), ...(scenario === 'C' ? { destinationDeploymentId: '' } : {}) })
  const [error, setError] = useState('')
  const get = (id: string) => simulation.objects.find(o => o.id === id)
  const revisions = simulation.objects.filter(o => o.kind === 'InteractionRevision' && object.links.some(l => l.id === o.fields.interaction))
  const revision = get(subject.interactionRevisionId), interaction = revision && get(revision.fields.interaction)
  const deployments = simulation.objects.filter(o => o.kind === 'ComponentDeployment')
  // Only offer directed participants accepted by the same transition validator.
  const sources = deployments.filter(o => { try { validateSubject({ ...subject, sourceDeploymentId: o.id, destinationDeploymentId: originalSubject.destinationDeploymentId }, object.id); return true } catch { return false } })
  const destinations = scenario === 'C' ? [] : deployments.filter(o => { try { validateSubject({ ...subject, destinationDeploymentId: o.id }, object.id); return true } catch { return false } })
  let invalid = ''
  try { validateSubject(subject, object.id, scenario) } catch (e) { invalid = (e as Error).message }
  const key = subjectKey(subject)
  const matches = simulation.objects.filter(o => ['AccessRequest', 'PolicyRule'].includes(o.kind) && subjectOf(o) && subjectKey(subjectOf(o)!) === key)
  const requests = matches.filter(o => o.kind === 'AccessRequest'), rules = matches.filter(o => o.kind === 'PolicyRule')
  const history = simulation.objects.filter(o => o.kind === 'AccessRequest' && o.links.some(l => l.id === object.id) && !requests.some(r => r.id === o.id))
  const active = rules.some(o => o.state === 'Active')
  const select = (label: string, field: keyof Subject, options: MockObject[]) => <label>{label}<select aria-label={label} value={subject[field]} disabled={!options.length} onChange={e => { setError(''); setSubject({ ...subject, [field]: e.target.value }) }}>
    {!options.length && <option value="">Нет совместимых Deployment</option>}{options.map(o => <option key={o.id} value={o.id}>{o.name} · {o.summary}</option>)}
  </select></label>
  return <div className="nid-composition" aria-label="Составление заявки на вкладке Коммуникация">
    <div className="nid-fixture"><label>Сценарное состояние<select aria-label="Сценарное состояние" value={scenario} onChange={e => { const next = new URLSearchParams(params); next.set('scenario', e.target.value); setParams(next, { replace: true }) }}><option value="A">S02-A · новый subject</option><option value="B">S02-B · существующий P1</option><option value="C">S02-C · нет destination</option></select></label><span>Только синтетический fixture. Переключение не изменяет ранее созданные заявки.</span></div>
    <div className="nid-context"><div><small>ЗАЧЕМ НУЖЕН ДОСТУП</small><strong>Запись проводки по завершённому заказу</strong><span>OrderClient должен передать бухгалтерскую операцию в LedgerApi</span></div><div><small>БИЗНЕС-КОНТЕКСТ</small><Link to="/prototype/processes/mock-process">Settlement · проведение заказов</Link><span>Ответственность: Finance · основание, не разрешение</span></div><div><small>СВЯЗАННЫЙ ПРОФИЛЬ ПРИЛОЖЕНИЯ</small><Link to="/prototype/applications/mock-application">Order-to-Ledger HTTPS</Link><span>Interaction: OrderClient → LedgerApi</span></div></div>
    <form className="nid-grid" onSubmit={e => { e.preventDefault(); setError(''); try { const id = simulation.create(subject, object.id, scenario); navigate('/prototype/requests/' + id) } catch (e) { setError((e as Error).message) } }}>
      <div className="nid-stack">
        <Panel title="Коммуникация и точные параметры">{interaction && <Link className="nid-interaction-link" to={objectPath(interaction)}>{interaction.name} ↗</Link>}<p className="ux-note">Направление определяется Interaction, а не порядком выбора в форме.</p><div className="nid-direction"><strong>{interaction?.fields.sourceComponent}</strong><div className="nid-arrow"><span aria-hidden="true">⟶</span><small>Передаёт данные</small></div><strong>{interaction?.fields.destinationComponent}</strong></div><div className="nid-choices">{select('Точная InteractionRevision', 'interactionRevisionId', revisions)}<div><small>Трафик выбранной ревизии</small><p>{revision?.fields.traffic}</p><p className="ux-note">Название профиля не доказывает HTTPS на L7.</p></div></div></Panel>
        <Panel title="Выбор развёрнутых компонентов"><div className="nid-choices">{select('Источник', 'sourceDeploymentId', sources)}{select('Получатель', 'destinationDeploymentId', destinations)}</div><div className="nid-choices"><p className="ux-note">Совпадает роль OrderClient. В mock есть access.request на исходный Resource.</p><p className="ux-note">{scenario === 'C' ? 'В fixture C нет совместимого LedgerApi Deployment. Это не утверждение о реальном каталоге.' : 'Совпадает роль LedgerApi. Grant access.request на destination для подачи не требуется.'}</p></div>{scenario === 'C' && <p className="nid-warning">Чтобы продолжить, измените сценарный контекст или проверьте связанные Deployment. DENIED на этом шаге не создаётся.</p>}</Panel>
      </div>
      <div className="nid-stack">
        <Panel title="Существующие заявки и разрешения">
          <div className={active ? 'nid-warning' : 'nid-notice'}>{invalid ? 'Exact AccessSubject пока не сформирован; проверить существующий доступ невозможно.' : active ? 'Для выбранного предмета уже есть ACTIVE PolicyRule.' : rules.length ? 'Для выбранного предмета есть INACTIVE PolicyRule. Повторный ALLOWED не реактивирует Rule.' : 'Для выбранного предмета разрешение не найдено в проверенном синтетическом наборе.'}</div>
          {!invalid && <><p>{requests.length} видимых заявок · {rules.length} доступных PolicyRule по exact subject</p>{matches.map(o => <p className="nid-history-row" key={o.id}><Link to={objectPath(o)}>{o.name}</Link><span>{o.state === 'Active' ? 'ACTIVE' : o.state}</span></p>)}<p className="ux-note">Повторная заявка допустима. ALLOWED переиспользует канонический Rule; DENIED не отзывает существующий Rule. Наличие ACTIVE не доказывает работу сети.</p></>}
          {!!history.length && <details open><summary>История Need с другим предметом доступа</summary>{history.map(o => <p className="nid-history-row" key={o.id}><Link to={objectPath(o)}>{o.name}</Link><span>{o.state}</span></p>)}<p className="ux-note">P1 относится к dep-ledger-1, а не к dep-ledger-2.</p></details>}
          <p className="ux-note">Только доступные mock-данные. Отсутствие видимых записей не доказывает отсутствие скрытых.</p>
        </Panel>
        <Panel title="Сводка перед подачей"><div className="nid-subject" aria-label="Exact AccessSubject"><p className="ux-eyebrow">Exact AccessSubject · упорядоченная тройка</p><code>{subjectLabel(subject)}</code></div><dl className="nid-summary"><div><dt>Направление</dt><dd>OrderClient → LedgerApi</dd></div><div><dt>Трафик</dt><dd>{revision?.fields.traffic}</dd></div><div><dt>Бизнес-основание</dt><dd>{object.name}</dd></div></dl><p className="ux-note">Need и IP-адреса не входят в identity AccessSubject. Revision после подачи неизменяема.</p>{invalid && <p className="nid-warning">{invalid}</p>}</Panel>
        <section className="nid-submit" aria-label="Подтверждение подачи"><h2>{invalid ? 'Отправка заявки пока недоступна' : 'Создать самостоятельную AccessRequest?'}</h2><p>После подтверждения появится новая заявка PENDING. ALLOWED / DENIED принимает независимый Decider; доступ пока не предоставляется.</p>{error && <p role="alert">{error}</p>}{simulation.role !== 'Requester' && <p>Подача доступна в демонстрационной роли Requester.</p>}<Button type="submit" disabled={!!invalid || simulation.role !== 'Requester'}>Подтвердить и отправить заявку →</Button><p className="ux-note">MOCK · без API. В реальном процессе сервер повторно проверяет полномочия и совместимость.</p></section>
      </div>
    </form>
    <p className="ux-note">ALLOWED / ACTIVE PolicyRule — декларированное разрешение, не гарантия фактической сетевой доступности.</p>
  </div>
}
