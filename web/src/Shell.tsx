import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Frame } from './Frame'
import { navigation } from './navigation'
import { DemoActor } from './DemoProfile'

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <Frame real navigation={<nav aria-label="Основная навигация" className="ux-navigation">
    {[...new Set(navigation.map(item => item.group))].map(group => <div key={group}><p className="ux-nav-label">{group}</p><ul>
      {navigation.filter(item => item.group === group).map(item => {
        const active = pathname === item.path || pathname.startsWith(item.path + '/')
        return <li key={item.path}><Link to={item.path} aria-current={active ? 'page' : undefined} className={active ? 'selected' : ''}>{item.title}</Link></li>
      })}
    </ul></div>)}
  </nav>} header={<><span>NAPMS 2.0</span><DemoActor /></>}>{children}</Frame>
}
