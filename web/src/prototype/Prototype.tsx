import { useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { byId, dataNature, evaluatedAt, natureLabel, objectPath, objects, sections, type MockObject } from './data'

function State({ value }: { value: string }) {
  const color = value === 'Drift' || value === 'DENIED' ? 'border-amber-300 bg-amber-50 text-amber-950'
    : value === 'Unknown' || value === 'Uncomparable' ? 'border-slate-300 bg-slate-100 text-slate-800'
    : 'border-sky-200 bg-sky-50 text-sky-950'
  return <Badge variant="outline" className={color}>{value}</Badge>
}

function ObjectStatus({ object }: { object: MockObject }) {
  if (!object.state) return null
  const label = object.state === 'Current' ? 'Актуальность' : ['Active', 'ALLOWED', 'DENIED'].includes(object.state) ? 'Состояние' : 'Данные'
  return <span className="inline-flex flex-wrap items-center gap-2 text-xs"><span className="text-slate-500">{label}</span><State value={object.state} /></span>
}

function linkedObjects(object: MockObject, kind: MockObject['kind']) {
  return object.links.map(link => byId.get(link.id)!).filter(target => target.kind === kind)
}

// Presentation context from existing fixture links, not new persistent relationships.
function applicationParents(object: MockObject): MockObject[] {
  if (object.kind === 'InteractionRevision') {
    const interaction = linkedObjects(object, 'Interaction')[0]
    return interaction ? [...applicationParents(interaction), interaction] : []
  }
  if (object.kind === 'Interaction') {
    const application = linkedObjects(object, 'Application')[0]
    return application ? [application] : []
  }
  return []
}

function ApplicationContext({ object }: { object: MockObject }) {
  if (object.kind === 'Application') {
    const interactions = linkedObjects(object, 'Interaction')
    const components = [...new Set(interactions.flatMap(item => [item.fields.sourceComponent, item.fields.destinationComponent]))]
    return <>
      <section className="panel space-y-4" aria-label="Components"><h2>Components</h2><p className="text-sm text-slate-500">Роли участников переиспользуемого профиля коммуникаций.</p>
        <ul className="grid gap-3 sm:grid-cols-2">{components.map(name => <li key={name} className="rounded-lg border bg-slate-50 px-4 py-3"><p className="font-medium">{name}</p><p className="text-xs text-slate-500">Component · роль участника</p></li>)}</ul>
      </section>
      <section className="panel space-y-4" aria-label="Interactions"><h2>Interactions</h2>
        <ul className="divide-y">{interactions.map(item => <li className="space-y-2 py-3 first:pt-0" key={item.id}><Link className="font-medium text-sky-800" to={objectPath(item)}>{item.name} →</Link><p className="text-sm">{item.fields.sourceComponent} <span className="text-slate-400">→</span> {item.fields.destinationComponent}</p><p className="text-sm text-slate-500">Назначение: {item.fields.purpose}</p></li>)}</ul>
      </section>
    </>
  }
  if (object.kind === 'Interaction') return <>
    <section className="panel space-y-4" aria-label="Communication"><h2>Направленная коммуникация</h2>
      <div className="flex flex-wrap items-center gap-3"><span className="rounded-md bg-slate-100 px-3 py-2"><small className="block text-slate-500">Source component</small>{object.fields.sourceComponent}</span><span aria-label="Направление">→</span><span className="rounded-md bg-slate-100 px-3 py-2"><small className="block text-slate-500">Destination component</small>{object.fields.destinationComponent}</span></div>
      <p className="text-sm">Назначение: {object.fields.purpose}</p>
    </section>
    <section className="panel space-y-4" aria-label="Interaction revisions"><h2>Interaction revisions</h2><p className="text-sm text-slate-500">Неизменяемые версии технических параметров этой коммуникации.</p>
      <ul className="divide-y">{linkedObjects(object, 'InteractionRevision').map(revision => <li key={revision.id} className="space-y-2 py-3"><Link className="font-medium text-sky-800" to={objectPath(revision)}>{revision.name} →</Link><p className="text-sm text-slate-500">{revision.fields.traffic}</p></li>)}</ul>
    </section>
  </>
  return null
}

function ObjectTable({ rows }: { rows: readonly MockObject[] }) {
  const [query, setQuery] = useState('')
  const visible = rows.filter(row => [row.id, row.name, row.kind, row.state, row.summary, ...Object.values(row.fields)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <section className="panel space-y-4" aria-label="Каталог объектов">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="w-full space-y-2 sm:max-w-md"><label htmlFor="prototype-search">Поиск объектов</label><Input id="prototype-search" placeholder="Имя, тип, состояние или адрес…" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <p className="text-sm text-slate-500" role="status">Показано {visible.length} из {rows.length}</p>
    </div>
    {visible.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">Фиктивные объекты раздела</caption>
      <thead className="bg-slate-50"><tr>{['Объект', 'Тип', 'Сводка', 'Контекст'].map(title => <th key={title} scope="col" className="border-y px-3 py-3 font-medium text-slate-600">{title}</th>)}</tr></thead>
      <tbody>{visible.map(row => <tr key={row.id} className="hover:bg-slate-50"><td className="min-w-40 border-b px-3 py-4"><Link className="font-medium text-sky-800" to={objectPath(row)}>{row.name}</Link></td><td className="max-w-48 break-words border-b px-3 py-4 text-xs text-slate-500">{row.kind}</td><td className="min-w-32 border-b px-3 py-4">{row.state ? <ObjectStatus object={row} /> : <span className="text-slate-400">—</span>}</td><td className="min-w-60 border-b px-3 py-4 text-slate-600">{row.summary}</td></tr>)}</tbody>
    </table></div> : <p>Нет совпадений. Измените поисковый запрос.</p>}
  </section>
}

function ObjectCard({ object }: { object: MockObject }) {
  return <>
    <section className="panel space-y-5" aria-label="Карточка объекта">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2>{object.kind}</h2><ObjectStatus object={object} /></div>
      <p className="text-slate-600">{object.summary}</p>
      {object.kind === 'InteractionRevision' && <p className="rounded-lg border bg-slate-50 p-3 text-sm"><strong>Неизменяемость параметров</strong> · Инвариант InteractionRevision: технические параметры версии неизменяемы. Это свойство версии, а не её жизненное состояние.</p>}
      <dl className="grid gap-5 text-sm sm:grid-cols-2">
        {Object.entries({ id: object.id, ...object.fields }).map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
      </dl>
      <details className="border-t pt-3 text-sm"><summary className="cursor-pointer font-medium text-slate-600">О данных</summary><p className="mt-2 text-slate-500">{natureLabel[dataNature[object.kind]]}. Все данные — mock в памяти; UI-ссылки не задают новые постоянные связи.</p></details>
    </section>
    <ApplicationContext object={object} />
    <section className="panel space-y-4" aria-label="Связанные объекты"><h2>Связанные объекты</h2>
      <p className="text-xs text-slate-500">UI-переходы и входы вычислений. Сама ссылка не задаёт постоянную связь ERD или SQL. Все данные — mock в памяти.</p>
      <ul className="divide-y">{object.links.map(link => {
        const target = byId.get(link.id)!
        return <li key={link.label} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="text-sm text-slate-500">{link.label}</span><Link className="text-sm font-medium text-sky-800" to={objectPath(target)}>{target.name} →</Link></li>
      })}</ul>
    </section>
  </>
}

function Overview() {
  return <>
    <div className="grid gap-4 sm:grid-cols-3">
      {[{ title: 'Декларировано', value: 'PERMIT TCP/443', link: 'mock-rule' }, { title: 'Расхождение', value: 'Drift · 443 / 8443', link: 'mock-drift' }, { title: 'Недостаточно данных', value: 'Uncomparable · ACL-CORE', link: 'mock-uncomparable' }].map(item => <Link className="panel space-y-2" key={item.link} to={objectPath(byId.get(item.link)!)}><p className="text-sm text-slate-500">{item.title}</p><p className="font-semibold">{item.value} →</p></Link>)}
    </div>
    <section className="panel space-y-4"><h2>Проследить одну коммуникацию</h2><p className="text-sm text-slate-600">Откройте ресурс и следуйте связям в карточках. Все идентификаторы принадлежат одному фиктивному сценарию.</p>
      <ol className="flex flex-wrap gap-2 text-sm">{['mock-resource-order', 'mock-deployment-order', 'mock-interaction-ledger', 'mock-need', 'mock-request-allowed', 'mock-rule', 'mock-required', 'mock-configured', 'mock-evidence-set-f2', 'mock-evidence-entry-f2', 'mock-drift'].map((id, index) => <li key={id}><Link className="inline-block rounded-md border bg-slate-50 px-3 py-2" to={objectPath(byId.get(id)!)}>{index + 1}. {byId.get(id)!.kind} →</Link></li>)}</ol>
    </section>
    <ObjectTable rows={objects.filter(object => object.kind === 'Reconciliation' || object.kind === 'AccessRequest')} />
  </>
}

export default function Prototype() {
  const { section = 'overview', objectId } = useParams()
  const current = sections.find(item => item.id === section)
  const object = objectId ? byId.get(objectId) : undefined
  const found = current && (!objectId || object?.section === current.id)
  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-slate-950 text-white"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8"><Link to="/prototype" className="text-xl font-semibold tracking-tight text-white">NAPMS <span className="ml-2 text-sm font-normal text-slate-300">2.0 / UX-0</span></Link><span className="text-xs text-slate-300">Исследовательский прототип · read-only</span></div></header>
    <div className="grid lg:min-h-[calc(100vh-61px)] lg:grid-cols-[220px_1fr]">
      <aside className="border-b bg-slate-100 px-4 py-5 lg:border-r">
        <nav aria-label="Prototype navigation" className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:block lg:space-y-5">
          {Array.from(new Set(sections.map(item => item.group))).map(group => <div className="min-w-0" key={group}><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group}</p><ul className="space-y-1">{sections.filter(item => item.group === group).map(item => <li key={item.id}><NavLink end={item.id === 'overview'} to={item.id === 'overview' ? '/prototype' : `/prototype/${item.id}`} className={({ isActive }) => `block rounded-md border-l-2 px-3 py-2 text-sm ${isActive ? 'border-sky-600 bg-sky-100 font-semibold text-sky-950' : 'border-transparent text-slate-600 hover:bg-slate-200'}`}>{item.title}</NavLink></li>)}</ul></div>)}
        </nav>
        <nav aria-label="Real API navigation" className="mt-8 space-y-2 border-t pt-5 text-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Реальный API · отдельные данные</p><Link className="block py-1" to="/access-requests">Заявки →</Link><Link className="block py-1" to="/access-requests/new">Новая заявка →</Link><p className="text-xs text-slate-500">Потребуется локальный credential. Mock-объекты не переносятся.</p></nav>
      </aside>
      <main className="min-w-0 space-y-6 p-5 lg:p-8">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>MOCK / FICTIONAL NETWORK DATA</strong><p>Только выдуманные данные. API, SQLite и credentials не используются. Сетевые операции не выполняются. IA и будущие возможности — UX-гипотезы.</p></div>
        <nav aria-label="Breadcrumbs" className="flex flex-wrap gap-2 text-sm text-slate-500"><Link to="/prototype">UX-0</Link><span>/</span>{current && <Link to={current.id === 'overview' ? '/prototype' : `/prototype/${current.id}`}>{current.title}</Link>}{object && <>{applicationParents(object).map(parent => <span className="contents" key={parent.id}><span>/</span><Link to={objectPath(parent)}>{parent.name}</Link></span>)}<span>/</span><span aria-current="page">{object.name}</span></>}</nav>
        {!found ? <section className="panel space-y-3"><h1>Объект не найден</h1><p>В фиктивном наборе нет такой ссылки.</p><Link to="/prototype">Вернуться к обзору</Link></section> : <>
          <div><p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">UX-0 / {current.group}</p><h1>{object?.name ?? current.title}</h1><p className="mt-2 max-w-4xl text-sm text-slate-500">{current.description}</p></div>
          {object ? <ObjectCard object={object} /> : current.id === 'overview' ? <Overview /> : <ObjectTable key={current.id} rows={objects.filter(item => item.section === current.id && (current.id !== 'applications' || item.kind === 'Application'))} />}
        </>}
        <footer className="border-t pt-4 text-xs text-slate-500">Фиксированная оценка: {evaluatedAt} · Не live-статус · Источник: единый UX-0 fixture</footer>
      </main>
    </div>
  </div>
}
