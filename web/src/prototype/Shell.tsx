import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Frame } from '../Frame'
import { sections } from './data'
import { useSimulation, type MockRole } from './simulation'

export function Shell({ children }: { children: ReactNode }) {
  const simulation = useSimulation(), navigate = useNavigate(), { pathname } = useLocation()
  const object = simulation.objects.find(object => object.id === pathname.split('/')[3])
  const section = object?.kind === 'BusinessProcess' ? 'processes' : object?.section ?? pathname.split('/')[2]
  return <Frame home="/prototype" navigation={<>
    <nav aria-label="Prototype navigation" className="ux-navigation">
      {Array.from(new Set(sections.map(item => item.group))).map(group => <div key={group}><p className="ux-nav-label">{group}</p><ul>{sections.filter(item => item.group === group).map(item => <li key={item.id}><Link to={`/prototype/${item.id}`} aria-current={section === item.id ? 'page' : undefined} className={section === item.id ? 'selected' : ''}>{item.title}</Link></li>)}</ul></div>)}
    </nav>
    <div className="ux-api"><Link to="/prototype">MOCK Simulation →</Link><Link to="/prototype/requests">Заявки MOCK →</Link></div>
  </>} header={<><strong>RESEARCH / MOCK</strong><span>Фиктивные данные · Simulation · без API</span><label className="nid-role">MOCK · Демонстрационная роль<select aria-label="Демонстрационная роль" value={simulation.role} onChange={e => simulation.setRole(e.target.value as MockRole)}><option value="Requester">Requester · alice-orders</option><option value="Decider">Decider · bob-policy</option><option value="Policy Viewer">Policy Viewer · policy.export (mock)</option></select></label><button onClick={() => { simulation.reset(); navigate('/prototype/needs/mock-need?tab=communication') }}>Сбросить mock-state</button></>}>
    {children}
  </Frame>
}
