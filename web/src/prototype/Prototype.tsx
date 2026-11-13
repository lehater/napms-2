import { useSimulation } from './simulation'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Resources, ResourceDetail, resourceListPath } from './Resources'
import { ObjectCollection, ObjectDetail, ObjectIndex, related } from './Views'
import { evaluatedAt, objectPath, sections, legacySections, type MockObject } from './data'
function parents(object: MockObject): MockObject[] {
  if (object.kind === 'Endpoint' || object.kind === 'ComponentDeployment') return related(object, 'Resource')
  if (object.kind === 'InteractionRevision') { const interaction = related(object, 'Interaction')[0]; return interaction ? [...parents(interaction), interaction] : [] }
  return object.kind === 'Interaction' ? related(object, 'Application') : []
}
export default function Prototype() {
  const { objects } = useSimulation()
  const byId = new Map(objects.map(o => [o.id, o]))
  const visibleCollection = (id: string) => objects.filter(o => { const collection = sections.find(s => s.id === id); return collection ? o.kind === collection.kind : o.section === id })
  const { section = 'overview', objectId } = useParams()
  const [params] = useSearchParams()
  const object = objectId ? byId.get(objectId) : undefined
  const current = object?.kind === 'BusinessProcess' && object.section === section ? sections[0] : [...sections, ...legacySections].find(item => item.id === section)
  if (section === 'policy' && object?.kind === 'AccessRequest') return <Navigate to={objectPath(object)} replace />
  const found = current && (!objectId || object?.section === section)
  const listParams = new URLSearchParams(params); listParams.delete('tab')
  const listPath = current?.id === 'resources' ? resourceListPath(params) : `/prototype/${current?.id}` + (listParams.size ? '?' + listParams : '')
  return <ObjectIndex.Provider value={byId}><>
    <nav aria-label="Breadcrumbs" className="ux-breadcrumbs"><Link to="/prototype">NAPMS</Link>{current && <><span>/</span><Link to={listPath}>{current.title}</Link></>}{object && <>{parents(object).map(parent => <span className="contents" key={parent.id}><span>/</span><Link to={objectPath(parent)}>{parent.name}</Link></span>)}<span>/</span><span aria-current="page">{object.name}</span></>}</nav>
    {!found ? <section className="ux-panel ux-panel-body"><h1>Объект не найден</h1><p>В фиктивном наборе нет такой ссылки.</p><Link to="/prototype">Вернуться к обзору</Link></section> : <>
      <div className="ux-heading" data-kind={object?.kind}><p className="ux-eyebrow">{object ? object.kind + ' · Object Detail' : 'Collection View · MOCK'}</p><div className="nid-heading-line"><h1>{object?.name ?? current.title}</h1>{object?.kind === 'ConnectivityNeed' && <span>ConnectivityNeed · {object.state}</span>}</div><p>{object?.summary ?? current.description}</p></div>
      {object?.kind === 'Resource' ? <ResourceDetail object={object} /> : object ? <ObjectDetail key={object.id} object={object} /> : current.id === 'resources' ? <Resources /> : current.id === 'overview' ? <section className="ux-panel"><h2>Бизнес-контекст → каталоги → управление доступом</h2><div className="ux-panel-body"><p>Семь учебных коллекций доступны только в Sidebar прототипа. Все данные здесь фиктивные. Этот учебный сценарий использует синтетические данные без API.</p><Link to="/prototype/processes">Открыть учебные бизнес-процессы (MOCK) →</Link></div></section> : current.id === 'network' ? <div className="ux-tab-content">{[...new Set(visibleCollection(current.id).map(item => item.kind))].map(kind => <ObjectCollection key={kind} title={kind} rows={visibleCollection(current.id).filter(item => item.kind === kind)} />)}</div> : <ObjectCollection key={current.id} remote title={current.id === 'requests' ? 'Заявки на доступ (MOCK)' : current.title} rows={visibleCollection(current.id)} />}
      {current.id === 'policy' && <p className="ux-callout">Экспорт политики — вычисляемый результат GET /policy/export с серверной авторизацией и READY / INCOMPLETE. В MOCK экспорт не выполняется; Effective Policy не является отдельной сущностью.</p>}
    </>}
    <footer className="ux-note">Фиксированная оценка: {evaluatedAt} · Не live-статус · Источник: единый UX-0 fixture · MOCK Simulation сбрасывается при полной перезагрузке</footer>
  </></ObjectIndex.Provider>
}
