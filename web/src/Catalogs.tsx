import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, message, type Application, type CatalogPage, type Client, type Component, type ComponentDeployment, type Interaction, type Resource, type ResourceEndpoint } from './api'
import { useDemoProfile } from './DemoProfile'
import { Button } from './components/ui/button'
import { CollectionView } from './components/real/CollectionView'
import { DetailView } from './components/real/DetailView'
import { EntityTable } from './components/real/EntityTable'

function catalogError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) return 'Такое имя уже используется в этом профиле приложения.'
  if (error instanceof ApiError && error.status === 400) return 'Проверьте направление взаимодействия, компоненты и диапазон портов.'
  if (error instanceof ApiError && error.status === 404) return 'Объект или связанный каталог не найден.'
  return message(error)
}

function ErrorNotice({ text }: { text: string }) {
  return text ? <p role="alert" className="ux-field-error">{text}</p> : null
}

function CatalogGate({ children }: { children: (client: Client) => ReactNode }) {
  const profile = useDemoProfile()
  const [token, setToken] = useState('')
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const manualClient = useMemo(() => api(token, () => {
    setToken(''); setDraft(''); setNotice('401 · Credential недействителен. Введите действующий token.')
  }), [token])
  if (profile.enabled) {
    if (profile.error) return <section className="ux-panel ux-panel-body"><h1>Каталог недоступен</h1><p role="alert">{profile.error}</p></section>
    if (!profile.ready) return <p role="status">Проверка local-demo…</p>
    if (profile.actor === 'anonymous' || !profile.client) return <section className="ux-panel ux-panel-body"><h1>Каталог NAPMS</h1><p>Выберите Demo actor в шапке, чтобы открыть каталоги.</p></section>
    return <>{children(profile.client)}</>
  }
  return <>
    <section className="ux-panel ux-panel-body" aria-label="Catalog credentials">
      <strong>REAL-каталог</strong><ErrorNotice text={notice} />
      {token ? <><p role="status">Credential активен</p><Button type="button" variant="outline" onClick={() => { setToken(''); setDraft(''); setNotice('') }}>Очистить credential</Button></> :
        <form className="process-form" onSubmit={event => { event.preventDefault(); setToken(draft.trim()); setDraft(''); setNotice('') }}>
          <label htmlFor="catalog-token">Bearer token</label><input id="catalog-token" type="password" autoComplete="off" required value={draft} onChange={event => setDraft(event.target.value)} />
          <Button disabled={!draft.trim()}>Применить token</Button>
        </form>}
      <p className="ux-note">Credential хранится только в памяти вкладки.</p>
    </section>
    {token && children(manualClient)}
  </>
}

async function allPages<T>(load: (offset: number, limit: number) => Promise<CatalogPage<T>>) {
  const result: T[] = []
  let offset = 0
  let more = true
  while (more) {
    const page = await load(offset, 100)
    result.push(...page.items)
    more = page.hasMore
    offset += page.limit
  }
  return result
}

export function ApplicationCatalog() {
  return <CatalogGate>{client => <ApplicationRoutes client={client} />}</CatalogGate>
}

function ApplicationRoutes({ client }: { client: Client }) {
  return <Routes>
    <Route index element={<ApplicationList client={client} />} />
    <Route path="new" element={<NewApplication client={client} />} />
    <Route path=":applicationId" element={<ApplicationDetail client={client} />} />
    <Route path=":applicationId/components/:componentId" element={<ComponentDetail client={client} />} />
    <Route path=":applicationId/interactions/:interactionId" element={<InteractionDetail client={client} />} />
    <Route path="*" element={<section className="ux-panel ux-panel-body"><h1>Страница не найдена</h1><Link to="/applications">Профили приложений</Link></section>} />
  </Routes>
}

function ApplicationList({ client }: { client: Client }) {
  const [params, setParams] = useSearchParams()
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  const [page, setPage] = useState<CatalogPage<Application> | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true; setPage(null); setError('')
    client.applications(offset).then(result => { if (active) setPage(result) }).catch(reason => { if (active) setError(catalogError(reason)) })
    return () => { active = false }
  }, [client, offset, reload])
  return <CollectionView<Application> title="Профили приложений" description="Компоненты и направленные взаимодействия, используемые бизнес-процессами."
    actions={<Button asChild><Link to="/applications/new">Создать профиль</Link></Button>}
    rows={page?.items ?? []} columns={[{key:'application',title:'Профиль приложения',render:item=><Link to={'/applications/' + item.applicationId}>{item.name}</Link>}]}
    getKey={item=>item.applicationId} emptyText="Профили приложений ещё не созданы." loading={!page && !error} error={error}
    offset={offset} limit={page?.limit ?? 20} hasMore={page?.hasMore} onPrevious={()=>setParams(offset > 20 ? {offset:String(offset-20)} : {})}
    onNext={()=>setParams({offset:String(offset+(page?.limit ?? 20))})} onRefresh={()=>setReload(value=>value+1)} />
}

function NewApplication({ client }: { client: Client }) {
  const [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { const item = await client.createApplication(name); navigate('/applications/' + item.applicationId) }
    catch (reason) { setError(catalogError(reason)) } finally { setBusy(false) }
  }
  return <section className="ux-panel ux-panel-body"><nav className="ux-breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><Link to="/applications">Профили приложений</Link><span>/</span><span>Создание</span></nav>
    <h1>Создать профиль приложения</h1><ErrorNotice text={error} />
    <form className="process-form" onSubmit={submit}><label htmlFor="application-name">Название профиля</label><input id="application-name" required maxLength={300} value={name} onChange={event=>setName(event.target.value)} />
      <Button disabled={busy}>{busy ? 'Сохранение…' : 'Создать профиль'}</Button><Link to="/applications">Отмена</Link></form>
  </section>
}

function ApplicationDetail({ client }: { client: Client }) {
  const { applicationId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'components' || params.get('tab') === 'interactions' ? params.get('tab')! : 'overview'
  const [application, setApplication] = useState<Application | null>(null), [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => { let active = true; setApplication(null); setError(''); client.application(applicationId).then(item=>{if(active)setApplication(item)}).catch(reason=>{if(active)setError(catalogError(reason))}); return ()=>{active=false} }, [client, applicationId, reload])
  const href = (value: string) => value === 'overview' ? `/applications/${applicationId}` : `/applications/${applicationId}?tab=${value}`
  if (!application) return <section className="ux-panel ux-panel-body"><ErrorNotice text={error} />{!error && <p role="status">Загрузка профиля…</p>}</section>
  return <DetailView breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to="/applications">Профили приложений</Link><span>/</span><span aria-current="page">{application.name}</span></>}
    title={application.name} tabs={[{id:'overview',label:'Обзор',href:href('overview')},{id:'components',label:'Компоненты',href:href('components')},{id:'interactions',label:'Взаимодействия',href:href('interactions')}]} activeTab={tab}>
    {tab === 'overview' && <dl className="ux-properties"><div><dt>Идентификатор</dt><dd>{application.applicationId}</dd></div><div><dt>Компоненты и взаимодействия</dt><dd>Создавайте на соответствующих вкладках. Ревизия взаимодействия сохраняется вместе с направлением и портом.</dd></div></dl>}
    {tab === 'components' && <ComponentsTab client={client} application={application} reloadKey={reload} refresh={()=>setReload(value=>value+1)} />}
    {tab === 'interactions' && <InteractionsTab client={client} application={application} reloadKey={reload} refresh={()=>setReload(value=>value+1)} />}
  </DetailView>
}

function ComponentsTab({ client, application, reloadKey, refresh }: { client: Client; application: Application; reloadKey: number; refresh: () => void }) {
  const [page, setPage] = useState<CatalogPage<Component> | null>(null), [error, setError] = useState(''), [name, setName] = useState(''), [busy, setBusy] = useState(false)
  const [params, setParams] = useSearchParams(), offset = Math.max(0, Number(params.get('componentOffset')) || 0)
  useEffect(() => { let active=true; setPage(null); setError(''); client.components(application.applicationId, offset).then(value=>{if(active)setPage(value)}).catch(reason=>{if(active)setError(catalogError(reason))}); return ()=>{active=false} }, [client, application.applicationId, offset, reloadKey])
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { await client.createComponent(application.applicationId,name); setName(''); refresh() } catch(reason) { setError(catalogError(reason)) } finally { setBusy(false) } }
  return <div className="space-y-4"><h2>Компоненты приложения</h2><ErrorNotice text={error} />
    <form className="process-form" onSubmit={submit}><label htmlFor="component-name">Название компонента</label><input id="component-name" required maxLength={300} value={name} onChange={event=>setName(event.target.value)} /><Button disabled={busy}>{busy ? 'Сохранение…' : 'Добавить компонент'}</Button></form>
    <EntityTable<Component> rows={page?.items ?? []} columns={[{key:'name',title:'Компонент',render:item=><Link to={`/applications/${application.applicationId}/components/${item.componentId}`}>{item.name}</Link>},{key:'id',title:'Идентификатор',render:item=><span className="font-mono">{item.componentId}</span>}]} getKey={item=>item.componentId} emptyText="В приложении ещё нет компонентов." loading={!page && !error} error={error} />
    <div className="ux-pagination"><Button variant="outline" disabled={!offset} onClick={()=>setParams(offset > 20 ? {tab:'components',componentOffset:String(offset-20)} : {tab:'components'})}>Назад</Button><span>Страница {Math.floor(offset/20)+1}</span><Button variant="outline" disabled={!page?.hasMore} onClick={()=>setParams({tab:'components',componentOffset:String(offset+20)})}>Далее</Button></div>
  </div>
}

function InteractionsTab({ client, application, reloadKey, refresh }: { client: Client; application: Application; reloadKey: number; refresh: () => void }) {
  const [page, setPage] = useState<CatalogPage<Interaction> | null>(null), [components, setComponents] = useState<Component[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [source, setSource] = useState(''), [destination, setDestination] = useState(''), [protocol, setProtocol] = useState<'TCP'|'UDP'>('TCP'), [start, setStart] = useState('443'), [end, setEnd] = useState('443')
  const [params, setParams] = useSearchParams()
  const offset = Math.max(0, Number(params.get('interactionOffset')) || 0)
  useEffect(() => { let active=true; setPage(null); setError(''); Promise.all([client.interactions(application.applicationId,offset), allPages((pageOffset,limit)=>client.components(application.applicationId,pageOffset,limit))]).then(([rows,values])=>{if(active){setPage(rows);setComponents(values)}}).catch(reason=>{if(active)setError(catalogError(reason))}); return ()=>{active=false} }, [client,application.applicationId,offset,reloadKey])
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { await client.createInteraction(application.applicationId,{sourceComponentId:source,destinationComponentId:destination,ipProtocol:protocol,destinationPortStart:Number(start),destinationPortEnd:Number(end)}); refresh() } catch(reason) { setError(catalogError(reason)) } finally { setBusy(false) } }
  function changePage(nextOffset: number) { setParams(current => { const next = new URLSearchParams(current); next.set('tab','interactions'); if (nextOffset > 0) next.set('interactionOffset',String(nextOffset)); else next.delete('interactionOffset'); return next }) }
  return <div className="space-y-4"><h2>Направленные взаимодействия</h2><ErrorNotice text={error} />
    <form className="process-form grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submit}>
      <label>Источник<select required value={source} onChange={event=>setSource(event.target.value)}><option value="">Выберите компонент</option>{components.map(item=><option key={item.componentId} value={item.componentId}>{item.name}</option>)}</select></label>
      <label>Получатель<select required value={destination} onChange={event=>setDestination(event.target.value)}><option value="">Выберите компонент</option>{components.map(item=><option key={item.componentId} value={item.componentId}>{item.name}</option>)}</select></label>
      <label>Протокол<select value={protocol} onChange={event=>setProtocol(event.target.value as 'TCP'|'UDP')}><option value="TCP">TCP</option><option value="UDP">UDP</option></select></label>
      <label>Порт от<input type="number" required min={1} max={65535} value={start} onChange={event=>setStart(event.target.value)} /></label>
      <label>Порт до<input type="number" required min={1} max={65535} value={end} onChange={event=>setEnd(event.target.value)} /></label>
      <Button disabled={busy || !components.length}>{busy ? 'Сохранение…' : 'Создать взаимодействие'}</Button>
    </form>
    <EntityTable<Interaction> rows={page?.items ?? []} columns={[
      {key:'interaction',title:'Направление',render:item=><Link to={`/applications/${application.applicationId}/interactions/${item.interactionId}`}>{item.sourceComponentName} → {item.destinationComponentName}</Link>},
      {key:'revision',title:'Текущие ревизии',render:item=>item.revisions.map(revision=><span key={revision.interactionRevisionId}>{revision.ipProtocol} · {revision.destinationPortStart}{revision.destinationPortEnd!==revision.destinationPortStart?`–${revision.destinationPortEnd}`:''}</span>)},
    ]} getKey={item=>item.interactionId} emptyText="Взаимодействия ещё не созданы." loading={!page && !error} error={error} />
    <div className="ux-pagination"><Button variant="outline" disabled={!offset} onClick={()=>changePage(Math.max(0,offset-(page?.limit??20)))}>Назад</Button><span>Страница {Math.floor(offset/(page?.limit??20))+1}</span><Button variant="outline" disabled={!page?.hasMore} onClick={()=>changePage(offset+(page?.limit??20))}>Далее</Button></div>
  </div>
}

function ComponentDetail({ client }: { client: Client }) {
  const { applicationId='', componentId='' } = useParams()
  const [loaded,setLoaded]=useState<{id:string;item:Component}|null>(null),[failure,setFailure]=useState<{id:string;text:string}|null>(null)
  useEffect(()=>{let active=true;setLoaded(null);setFailure(null);client.component(applicationId,componentId).then(value=>{if(active)setLoaded({id:componentId,item:value})}).catch(reason=>{if(active)setFailure({id:componentId,text:catalogError(reason)})});return()=>{active=false}},[client,applicationId,componentId])
  const item=loaded?.id===componentId?loaded.item:null,error=failure?.id===componentId?failure.text:''
  if(!item)return <section className="ux-panel ux-panel-body"><ErrorNotice text={error}/>{!error&&<p role="status">Загрузка компонента…</p>}</section>
  return <DetailView breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to="/applications">Профили приложений</Link><span>/</span><Link to={`/applications/${applicationId}`}>{item.applicationName}</Link><span>/</span><span aria-current="page">{item.name}</span></>}
    title={item.name} tabs={[{id:'overview',label:'Обзор',href:`/applications/${applicationId}/components/${componentId}`}]} activeTab="overview">
    <dl className="ux-properties"><div><dt>Профиль приложения</dt><dd><Link to={`/applications/${applicationId}`}>{item.applicationName}</Link></dd></div><div><dt>Идентификатор</dt><dd>{item.componentId}</dd></div></dl>
  </DetailView>
}

function InteractionDetail({ client }: { client: Client }) {
  const { applicationId='', interactionId='' } = useParams()
  const [loaded,setLoaded]=useState<{id:string;item:Interaction}|null>(null),[failure,setFailure]=useState<{id:string;text:string}|null>(null)
  useEffect(()=>{let active=true;setLoaded(null);setFailure(null);client.interaction(applicationId,interactionId).then(value=>{if(active)setLoaded({id:interactionId,item:value})}).catch(reason=>{if(active)setFailure({id:interactionId,text:catalogError(reason)})});return()=>{active=false}},[client,applicationId,interactionId])
  const item=loaded?.id===interactionId?loaded.item:null,error=failure?.id===interactionId?failure.text:''
  if(!item)return <section className="ux-panel ux-panel-body"><ErrorNotice text={error}/>{!error&&<p role="status">Загрузка взаимодействия…</p>}</section>
  return <DetailView breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to="/applications">Профили приложений</Link><span>/</span><Link to={`/applications/${applicationId}?tab=interactions`}>{item.applicationName}</Link><span>/</span><span aria-current="page">Взаимодействие</span></>}
    title={`${item.sourceComponentName} → ${item.destinationComponentName}`} subtitle={<Link to={`/applications/${applicationId}`}>{item.applicationName}</Link>}
    tabs={[{id:'overview',label:'Ревизии',href:`/applications/${applicationId}/interactions/${interactionId}`}]} activeTab="overview">
    <EntityTable rows={item.revisions} columns={[{key:'protocol',title:'Протокол',render:revision=>revision.ipProtocol},{key:'ports',title:'Порт назначения',render:revision=>revision.destinationPortStart===revision.destinationPortEnd?String(revision.destinationPortStart):`${revision.destinationPortStart}–${revision.destinationPortEnd}`},{key:'revision',title:'Revision ID',render:revision=><span className="font-mono">{revision.interactionRevisionId}</span>}]} getKey={revision=>revision.interactionRevisionId} emptyText="Ревизии отсутствуют." />
  </DetailView>
}

export function DeploymentCatalog() {
  return <CatalogGate>{client => <DeploymentRoutes client={client} />}</CatalogGate>
}

export function ResourceCatalog() {
  return <CatalogGate>{client => <ResourceRoutes client={client} />}</CatalogGate>
}

function ResourceRoutes({ client }: { client: Client }) {
  return <Routes><Route index element={<ResourceList client={client} />} /><Route path="new" element={<NewResource client={client} />} /><Route path=":resourceId" element={<ResourceDetailView client={client} />} /><Route path="*" element={<section className="ux-panel ux-panel-body"><h1>Страница не найдена</h1><Link to="/resources">Ресурсы</Link></section>} /></Routes>
}

function ResourceList({ client }: { client: Client }) {
  const [params, setParams] = useSearchParams(), offset = Math.max(0, Number(params.get('offset')) || 0)
  const [page, setPage] = useState<CatalogPage<Resource> | null>(null), [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => { let active = true; setPage(null); setError(''); client.resources(offset).then(value => { if (active) setPage(value) }).catch(reason => { if (active) setError(catalogError(reason)) }); return () => { active = false } }, [client, offset, reload])
  return <CollectionView<Resource> title="Ресурсы" description="Сетевые ресурсы и их стабильные Endpoints. Создание Resource не выдаёт полномочия на подачу заявок."
    actions={<Button asChild><Link to="/resources/new">Создать Resource</Link></Button>}
    rows={page?.items ?? []} columns={[{key:'resource',title:'Resource',render:item=><Link to={'/resources/' + item.resourceId}>{item.name}<small>{item.resourceId}</small></Link>}]}
    getKey={item=>item.resourceId} emptyText="Ресурсы ещё не созданы." loading={!page && !error} error={error}
    offset={offset} limit={page?.limit ?? 20} hasMore={page?.hasMore} onPrevious={()=>setParams(offset > 20 ? {offset:String(offset-20)} : {})}
    onNext={()=>setParams({offset:String(offset+(page?.limit ?? 20))})} onRefresh={()=>setReload(value=>value+1)} />
}

function NewResource({ client }: { client: Client }) {
  const [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { const item = await client.createResource(name); navigate(`/resources/${item.resourceId}?tab=endpoints`) }
    catch (reason) { setError(catalogError(reason)) } finally { setBusy(false) }
  }
  return <section className="ux-panel ux-panel-body"><nav className="ux-breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><Link to="/resources">Ресурсы</Link><span>/</span><span>Создание</span></nav>
    <h1>Создать Resource</h1><p>Для нового Resource создаётся один стабильный Endpoint без адреса. Полномочия доступа не выдаются автоматически.</p><ErrorNotice text={error} />
    <form className="process-form" onSubmit={submit}><label htmlFor="resource-name">Название Resource</label><input id="resource-name" required maxLength={300} value={name} onChange={event=>setName(event.target.value)} />
      <Button disabled={busy}>{busy ? 'Сохранение…' : 'Создать Resource'}</Button><Link to="/resources">Отмена</Link></form>
  </section>
}

function DeploymentRoutes({ client }: { client: Client }) {
  return <Routes><Route index element={<DeploymentList client={client}/>} /><Route path="new" element={<NewDeployment client={client}/>} /><Route path=":deploymentId" element={<DeploymentDetail client={client}/>} /><Route path="*" element={<section className="ux-panel ux-panel-body"><h1>Страница не найдена</h1><Link to="/deployments">Развёрнутые компоненты</Link></section>} /></Routes>
}

function DeploymentList({ client }: { client: Client }) {
  const [params,setParams]=useSearchParams(),offset=Math.max(0,Number(params.get('offset'))||0)
  const [page,setPage]=useState<CatalogPage<ComponentDeployment>|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0)
  useEffect(()=>{let active=true;setPage(null);setError('');client.deployments(offset).then(value=>{if(active)setPage(value)}).catch(reason=>{if(active)setError(catalogError(reason))});return()=>{active=false}},[client,offset,reload])
  return <CollectionView<ComponentDeployment> title="Развёрнутые компоненты" description="Размещения компонентов на существующих Resources."
    actions={<Button asChild><Link to="/deployments/new">Создать развёртывание</Link></Button>}
    rows={page?.items??[]} columns={[{key:'deployment',title:'Развёрнутый компонент',render:item=><Link to={'/deployments/'+item.deploymentId}>{item.componentName}<small>{item.applicationName} · {item.resourceName}</small></Link>},{key:'resource',title:'Resource',render:item=><Link to={'/resources/'+item.resourceId}>{item.resourceName}</Link>}]}
    getKey={item=>item.deploymentId} emptyText="Развёртывания ещё не созданы." loading={!page&&!error} error={error} offset={offset} limit={page?.limit??20} hasMore={page?.hasMore}
    onPrevious={()=>setParams(offset>20?{offset:String(offset-20)}:{})} onNext={()=>setParams({offset:String(offset+(page?.limit??20))})} onRefresh={()=>setReload(value=>value+1)}/>
}

function NewDeployment({ client }: { client: Client }) {
  const [components,setComponents]=useState<Component[]>([]),[resources,setResources]=useState<Resource[]>([]),[componentId,setComponentId]=useState(''),[resourceId,setResourceId]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const navigate=useNavigate()
  useEffect(()=>{let active=true;Promise.all([allPages((offset,limit)=>client.applications(offset,limit)).then(apps=>Promise.all(apps.map(app=>allPages((offset,limit)=>client.components(app.applicationId,offset,limit))))).then(groups=>groups.flat()),allPages((offset,limit)=>client.resources(offset,limit))]).then(([componentRows,resourceRows])=>{if(active){setComponents(componentRows);setResources(resourceRows)}}).catch(reason=>{if(active)setError(catalogError(reason))});return()=>{active=false}},[client])
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const item=await client.createDeployment(componentId,resourceId);navigate('/deployments/'+item.deploymentId)}catch(reason){setError(catalogError(reason))}finally{setBusy(false)}}
  return <section className="ux-panel ux-panel-body"><nav className="ux-breadcrumbs"><Link to="/">NAPMS</Link><span>/</span><Link to="/deployments">Развёрнутые компоненты</Link><span>/</span><span>Создание</span></nav>
    <h1>Создать развёртывание</h1><p>Выберите существующие Component и Resource. Resource и Endpoint здесь не редактируются.</p><ErrorNotice text={error}/>
    <form className="process-form" onSubmit={submit}><label htmlFor="deployment-component">Компонент</label><select id="deployment-component" required value={componentId} onChange={event=>setComponentId(event.target.value)}><option value="">Выберите компонент</option>{components.map(item=><option key={item.componentId} value={item.componentId}>{item.applicationName} · {item.name}</option>)}</select>
      <label htmlFor="deployment-resource">Resource</label><select id="deployment-resource" required value={resourceId} onChange={event=>setResourceId(event.target.value)}><option value="">Выберите Resource</option>{resources.map(item=><option key={item.resourceId} value={item.resourceId}>{item.name}</option>)}</select>
      <Button disabled={busy||!components.length||!resources.length}>{busy?'Сохранение…':'Создать развёртывание'}</Button><Link to="/deployments">Отмена</Link></form>
  </section>
}

function DeploymentDetail({ client }: { client: Client }) {
  const {deploymentId=''}=useParams(),[loaded,setLoaded]=useState<{id:string;item:ComponentDeployment}|null>(null),[failure,setFailure]=useState<{id:string;text:string}|null>(null)
  useEffect(()=>{let active=true;setLoaded(null);setFailure(null);client.deployment(deploymentId).then(value=>{if(active)setLoaded({id:deploymentId,item:value})}).catch(reason=>{if(active)setFailure({id:deploymentId,text:catalogError(reason)})});return()=>{active=false}},[client,deploymentId])
  const item=loaded?.id===deploymentId?loaded.item:null,error=failure?.id===deploymentId?failure.text:''
  if(!item)return <section className="ux-panel ux-panel-body"><ErrorNotice text={error}/>{!error&&<p role="status">Загрузка развёртывания…</p>}</section>
  return <DetailView breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to="/deployments">Развёрнутые компоненты</Link><span>/</span><span aria-current="page">{item.componentName} · {item.resourceName}</span></>}
    title={item.componentName} subtitle={item.applicationName} tabs={[{id:'overview',label:'Обзор',href:`/deployments/${deploymentId}`}]} activeTab="overview">
    <dl className="ux-properties"><div><dt>Компонент</dt><dd><Link to={`/applications/${item.applicationId}/components/${item.componentId}`}>{item.componentName}</Link></dd></div><div><dt>Профиль приложения</dt><dd><Link to={`/applications/${item.applicationId}`}>{item.applicationName}</Link></dd></div><div><dt>Resource</dt><dd><Link to={`/resources/${item.resourceId}`}>{item.resourceName}</Link></dd></div><div><dt>Идентификатор</dt><dd>{item.deploymentId}</dd></div></dl>
  </DetailView>
}

function ResourceDetailView({client}:{client:Client}){
  const {resourceId=''}=useParams(),[params,setParams]=useSearchParams(),tab=params.get('tab')==='endpoints'?'endpoints':'overview'
  const [loaded,setLoaded]=useState<{id:string;item:Resource;endpoint:ResourceEndpoint;deployments:ComponentDeployment[]}|null>(null),[failure,setFailure]=useState<{id:string;text:string}|null>(null)
  const [kind,setKind]=useState<'HOST'|'PREFIX'>('HOST'),[address,setAddress]=useState(''),[saving,setSaving]=useState(false),[formError,setFormError]=useState(''),[reload,setReload]=useState(0)
  useEffect(()=>{let active=true;setLoaded(null);setFailure(null);Promise.all([client.resource(resourceId),client.resourceEndpoint(resourceId),allPages((offset,limit)=>client.deployments(offset,limit))]).then(([item,endpoint,deployments])=>{if(active)setLoaded({id:resourceId,item,endpoint,deployments:deployments.filter(row=>row.resourceId===resourceId)})}).catch(reason=>{if(active)setFailure({id:resourceId,text:catalogError(reason)})});return()=>{active=false}},[client,resourceId,reload])
  const data=loaded?.id===resourceId?loaded:null,error=failure?.id===resourceId?failure.text:''
  async function saveEndpoint(event:FormEvent){event.preventDefault();setSaving(true);setFormError('');try{await client.setResourceEndpoint(resourceId,kind,address);setAddress('');setReload(value=>value+1)}catch(reason){setFormError(catalogError(reason))}finally{setSaving(false)}}
  const href=(value:string)=>value==='overview'?`/resources/${resourceId}`:`/resources/${resourceId}?tab=${value}`
  if(!data)return <section className="ux-panel ux-panel-body"><ErrorNotice text={error}/>{!error&&<p role="status">Загрузка Resource…</p>}</section>
  const {item,endpoint,deployments}=data
  return <DetailView breadcrumbs={<><Link to="/">NAPMS</Link><span>/</span><Link to="/resources">Ресурсы</Link><span>/</span><span aria-current="page">{item.name}</span></>}
    title={item.name} tabs={[{id:'overview',label:'Обзор',href:href('overview')},{id:'endpoints',label:'Endpoints',href:href('endpoints')}]} activeTab={tab}>
    {tab==='overview'&&<><dl className="ux-properties"><div><dt>Идентификатор</dt><dd>{item.resourceId}</dd></div><div><dt>Текущий Endpoint</dt><dd>{endpoint.address ? `${endpoint.address} / ${endpoint.kind}` : 'Адрес не задан'}</dd></div><div><dt>Каталог</dt><dd><Link to="/deployments">Развёрнутые компоненты</Link></dd></div></dl>
      <h2>Связанные развёртывания</h2><EntityTable rows={deployments} columns={[{key:'deployment',title:'Компонент',render:row=><Link to={`/deployments/${row.deploymentId}`}>{row.componentName}<small>{row.applicationName}</small></Link>},{key:'deploymentResource',title:'Resource',render:row=><Link to={`/resources/${row.resourceId}`}>{row.resourceName}</Link>}]} getKey={row=>row.deploymentId} emptyText="Развёртывания для этого Resource отсутствуют." /></>}
    {tab==='endpoints'&&<><EntityTable rows={[endpoint]} columns={[{key:'endpoint',title:'Endpoint ID',render:row=><span className="font-mono">{row.endpointId}</span>},{key:'kind',title:'Тип',render:row=>row.kind??'Не задан'},{key:'address',title:'Текущий адрес',render:row=>row.address??'Адрес не задан'}]} getKey={row=>row.endpointId} emptyText="Endpoint отсутствует." />
      <h2>Назначить или заменить адрес</h2><ErrorNotice text={formError}/><form className="process-form" onSubmit={saveEndpoint}><label htmlFor="endpoint-kind">Тип адреса</label><select id="endpoint-kind" value={kind} onChange={event=>setKind(event.target.value as 'HOST'|'PREFIX')}><option value="HOST">HOST · IP-адрес</option><option value="PREFIX">PREFIX · CIDR</option></select>
        <label htmlFor="endpoint-address">IPv4 / IPv6 адрес</label><input id="endpoint-address" required maxLength={64} value={address} onChange={event=>setAddress(event.target.value)} placeholder={kind==='HOST'?'192.0.2.10':'192.0.2.0/24'} />
        <Button disabled={saving}>{saving?'Сохранение…':'Сохранить адрес'}</Button></form></>}
  </DetailView>
}
