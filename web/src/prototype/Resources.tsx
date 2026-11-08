import { useId, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { byId, evaluatedAt, natureLabel, objectPath, objects, type MockObject } from './data'

export type Row = { kind?: MockObject['kind']; id: string; values: Record<string, string>; path?: string }
export type Column = { key: string; title: string; render?: (row: Row) => ReactNode }
type Filter = { key: string; title: string }
const resourceRows = objects.filter(object => object.kind === 'Resource')
const site = (object: MockObject) => object.fields.siteHistory.split(' · ')[0]
const address = (object: MockObject) => object.fields.currentAddressFromHistory.split(' · ')[0]
const owner = (object: MockObject) => object.fields.responsibilityHistory.split(' · ')[0]
function listContext(params: URLSearchParams) {
  const result = new URLSearchParams()
  for (const key of ['q', 'scope', 'site', 'state', 'size', 'page']) if (params.has(key)) result.set(key, params.get(key)!)
  return result
}
export function resourceListPath(params: URLSearchParams) {
  const query = listContext(params).toString()
  return '/prototype/resources' + (query ? '?' + query : '')
}

// One table pattern for the top-level and parent-scoped fixture collections.
export function Collection({ rows, columns, filters = [], remote = false, label }: { rows: Row[]; columns: Column[]; filters?: Filter[]; remote?: boolean; label: string }) {
  const id = useId()
  const [url, setUrl] = useSearchParams()
  const [local, setLocal] = useState(new URLSearchParams())
  const params = remote ? url : local
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    if (remote) setUrl(next, { replace: true }); else setLocal(next)
  }
  const query = params.get('q') ?? ''
  const visible = rows.filter(row => Object.values(row.values).join(' ').toLowerCase().includes(query.trim().toLowerCase()) && filters.every(filter => !params.get(filter.key) || row.values[filter.key] === params.get(filter.key)))
  const size = params.get('size') === '1' ? 1 : 2
  const pages = Math.max(1, Math.ceil(visible.length / size))
  const requested = Number(params.get('page') ?? 1)
  const page = Number.isInteger(requested) ? Math.max(1, Math.min(pages, requested)) : 1
  const sliced = visible.slice((page - 1) * size, page * size)
  return <section className="ux-collection" aria-label={label}>
    <div className="ux-filters">
      <label htmlFor={id + '-search'}>Поиск объектов<input id={id + '-search'} placeholder="Имя, scope или адрес…" value={query} onChange={event => update('q', event.target.value)} /></label>
      {filters.map(filter => <label key={filter.key}>{filter.title}<select aria-label={filter.title} value={params.get(filter.key) ?? ''} onChange={event => update(filter.key, event.target.value)}><option value="">Все</option>{Array.from(new Set(rows.map(row => row.values[filter.key]))).map(value => <option key={value}>{value}</option>)}</select></label>)}
      <p role="status">Показано {visible.length} из {rows.length}</p>
    </div>
    <div className="ux-table-scroll">{visible.length ? <table className="ux-table"><caption className="sr-only">{label}</caption><thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.title}</th>)}</tr></thead><tbody>{sliced.map(row => <tr key={row.id} data-object-id={row.id} data-object-kind={row.kind}>{columns.map((column, index) => <td key={column.key}>{column.render ? column.render(row) : index === 0 && row.path ? <Link to={row.path}>{row.values[column.key]}</Link> : row.values[column.key]}</td>)}</tr>)}</tbody></table> : <p className="ux-empty">Нет совпадений. Измените поисковый запрос.</p>}</div>
    <div className="ux-pagination"><span>{visible.length ? (page - 1) * size + 1 : 0}–{Math.min(page * size, visible.length)} из {visible.length}</span><div><label>Строк на странице <select aria-label="Строк на странице" value={size} onChange={event => update('size', event.target.value)}><option value="1">1</option><option value="2">2</option></select></label><button aria-label="Предыдущая страница" disabled={page <= 1} onClick={() => update('page', String(page - 1))}>‹</button><span>Страница {page} из {pages}</span><button aria-label="Следующая страница" disabled={page >= pages} onClick={() => update('page', String(page + 1))}>›</button></div></div>
  </section>
}
export function Resources() {
  const [params] = useSearchParams()
  const context = listContext(params).toString()
  return <>
    <Collection label="Resources collection" remote rows={resourceRows.map(object => ({ kind: object.kind, id: object.id, path: objectPath(object) + (context ? '?' + context : ''), values: { name: object.name, id: object.id, scope: object.fields.scope, address: address(object), site: site(object), owner: owner(object) } }))}
      columns={[{ key: 'name', title: 'Resource', render: row => <><Link to={row.path!}>{row.values.name}</Link><small>{row.id}</small></> }, { key: 'scope', title: 'Scope' }, { key: 'address', title: 'Endpoints / текущий адрес', render: row => <>{row.values.address}<small>{resourceRows.find(item => item.id === row.id)?.fields.endpoint}</small></> }, { key: 'site', title: 'Площадка' }, { key: 'owner', title: 'Ответственность' }]}
      filters={[{ key: 'scope', title: 'Scope' }, { key: 'site', title: 'Площадка' }]} />
    <p className="ux-note">Fixture: 2 Resource, по одному Endpoint. Адрес прочитан из EndpointAddressHistory на {evaluatedAt}. OWNER не предоставляет grant.</p>
  </>
}

export function ResourceDetail({ object }: { object: MockObject }) {
  const [params] = useSearchParams()
  const selected = params.get('tab') ?? 'overview'
  const tab = ['overview', 'endpoints', 'deployments', 'history'].includes(selected) ? selected : 'overview'
  const endpoints = object.links.map(link => byId.get(link.id)!).filter(target => target.kind === 'Endpoint')
  const deployments = object.links.map(link => byId.get(link.id)!).filter(target => target.kind === 'ComponentDeployment')
  const history: Row[] = [
    { id: 'address', values: { fact: 'EndpointAddressHistory', value: endpoints[0]?.fields.addressHistory ?? 'Отсутствует в fixture', source: endpoints[0]?.id ?? 'Нет Endpoint' } },
    { id: 'site', values: { fact: 'Площадка', value: object.fields.siteHistory, source: object.id + ' / siteHistory' } },
    { id: 'owner', values: { fact: 'Ответственность', value: object.fields.responsibilityHistory, source: object.id + ' / responsibilityHistory' } },
  ]
  return <>
    <nav aria-label="Resource tabs" className="ux-tabs">{[['overview', 'Обзор', undefined], ['endpoints', 'Endpoints', endpoints.length], ['deployments', 'Развёрнутые компоненты', deployments.length], ['history', 'История', history.length]].map(([key, title, count]) => {
      const next = listContext(params)
      if (key !== 'overview') next.set('tab', String(key))
      return <Link key={key} aria-current={key === tab ? 'page' : undefined} to={{ pathname: objectPath(object), search: next.toString() }}>{title}{count !== undefined && <small>{count}</small>}</Link>
    })}</nav>
    {tab === 'overview' && <div className="ux-detail-grid">
      <section className="ux-panel" aria-label="Карточка объекта"><h2>Resource overview</h2><div className="ux-panel-body"><div className="ux-representation"><div><p className="ux-eyebrow">Resource · стабильная identity</p><strong>{object.name}</strong><p className="ux-note">{object.fields.scope}</p></div><div><p className="ux-eyebrow">Текущий адрес из истории</p><strong>{address(object)}</strong><p className="ux-note">EndpointAddressHistory · {evaluatedAt}</p></div></div><p className="ux-note">{object.summary}</p><p className="ux-note">Endpoint — структурно подчинён Resource. Deployments — самостоятельные связанные размещения; они доступны на отдельной вкладке.</p><details><summary>О данных</summary><p>{natureLabel.persistent}. Все данные — mock в памяти; UI-ссылки не задают новые постоянные связи.</p></details></div></section>
      <section className="ux-panel" aria-label="Основные свойства"><h2>Основные свойства</h2><dl className="ux-panel-body ux-properties">{Object.entries({ id: object.id, Scope: object.fields.scope, Endpoint: object.fields.endpoint, 'Данные': object.state!, 'Площадка на дату оценки': site(object), 'Ответственность на дату оценки': owner(object) }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p className="ux-panel-body ux-note">OWNER не является action grant. Временные интервалы — на вкладке History.</p></section>
    </div>}
    {(tab === 'endpoints' || tab === 'deployments') && <section aria-label="Связанные объекты">
      <p className="ux-note">{tab === 'endpoints' ? 'Структурное подчинение: один Endpoint на Resource в fixture.' : 'Самостоятельные связанные ComponentDeployment на этом Resource. UI-переход не создаёт новую постоянную связь.'}</p>
      <Collection key={tab} label={tab === 'endpoints' ? 'Resource Endpoints' : 'Resource Deployments'} rows={(tab === 'endpoints' ? endpoints : deployments).map(target => ({ id: target.id, path: objectPath(target), values: { name: target.name + ' →', id: target.id, address: target.fields.currentAddressFromHistory ?? '', component: target.fields.component ?? '', state: target.state ?? '—', summary: target.summary } }))}
        columns={tab === 'endpoints' ? [{ key: 'name', title: 'Endpoint' }, { key: 'address', title: 'Текущий адрес / тип' }, { key: 'summary', title: 'Назначение' }] : [{ key: 'name', title: 'Deployment' }, { key: 'component', title: 'Component' }, { key: 'state', title: 'Состояние' }, { key: 'summary', title: 'Назначение' }]} />
    </section>}
    {tab === 'history' && <><p className="ux-note">Только подтверждённые интервальные факты fixture, не журнал событий. Предыдущие значения, авторы и события изменений отсутствуют. ∞ — открытый конец интервала; оценка фиксирована на {evaluatedAt}.</p><Collection label="Resource History" rows={history} columns={[{ key: 'fact', title: 'Исторический факт' }, { key: 'value', title: 'Значение и интервал' }, { key: 'source', title: 'Источник fixture' }]} filters={[{ key: 'fact', title: 'Тип факта' }]} /></>}
    <p className="ux-note"><Link to={resourceListPath(params)}>← К списку Resources</Link></p>
  </>
}
