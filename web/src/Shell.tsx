import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Frame } from './Frame'
import { navigation } from './navigation'
import { DemoActor } from './DemoProfile'

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <Frame real navigation={<nav aria-label="Основная навигация" className="ux-navigation">
    {navigation.map(item => {
      const active = pathname.startsWith(item.path) || (item.path === '/access-requests' && pathname.startsWith('/policy-rules/'))
      return <div key={item.path}><p className="ux-nav-label">{item.group}</p><ul><li><Link to={item.path} aria-current={active ? 'page' : undefined} className={active ? 'selected' : ''}>{item.title}</Link></li></ul></div>
    })}
  </nav>} header={<><span>NAPMS 2.0</span><DemoActor /></>}>{children}</Frame>
}
