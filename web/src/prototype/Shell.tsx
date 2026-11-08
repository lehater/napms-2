import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sections } from './data'
import './baseline.css'

export const sidebarWidthKey = 'napms.prototype.sidebarWidth'
const clamp = (width: number) => Math.min(360, Math.max(200, width))

export function Shell({ children, section }: { children: ReactNode; section?: string }) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(sidebarWidthKey))
      return Number.isFinite(saved) && saved >= 200 && saved <= 360 ? saved : 264
    } catch { return 264 }
  })
  function resize(value: number) {
    const next = clamp(value)
    setWidth(next)
    try { localStorage.setItem(sidebarWidthKey, String(next)) } catch { /* Session-only preference when storage is unavailable. */ }
  }
  return <div className="ux-shell" style={{ '--sidebar-width': `${width}px` } as CSSProperties}>
    <aside id="prototype-sidebar" className="ux-sidebar">
      <Link to="/prototype" className="ux-brand"><span className="ux-brand-icon">N</span><span><strong>NAPMS 2.0</strong><small>Network Access Policy Management</small></span></Link>
      <nav aria-label="Prototype navigation" className="ux-navigation">
        {Array.from(new Set(sections.map(item => item.group))).map(group => <div key={group}><p className="ux-nav-label">{group}</p><ul>{sections.filter(item => item.group === group).map(item => <li key={item.id}><Link to={`/prototype/${item.id}`} aria-current={section === item.id ? 'page' : undefined} className={section === item.id ? 'selected' : ''}>{item.title}</Link></li>)}</ul></div>)}
      </nav>
      <nav aria-label="Real API navigation" className="ux-api"><strong>REAL API</strong><Link to="/access-requests">Заявки →</Link><Link to="/access-requests/new">Новая заявка →</Link><p>Отдельные данные и credentials. Mock-объекты не переносятся.</p></nav>
    </aside>
    <div className="ux-sizer" role="separator" aria-controls="prototype-sidebar" aria-label="Sidebar width" aria-orientation="vertical" aria-valuemin={200} aria-valuemax={360} aria-valuenow={width} tabIndex={0}
      onKeyDown={event => {
        const next = event.key === 'Home' ? 200 : event.key === 'End' ? 360 : event.key === 'ArrowLeft' ? width - (event.shiftKey ? 50 : 10) : event.key === 'ArrowRight' ? width + (event.shiftKey ? 50 : 10) : undefined
        if (next !== undefined) { event.preventDefault(); resize(next) }
      }}
      onPointerDown={event => { if (event.button === 0) { event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus() } }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event.clientX) }}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}><span aria-hidden="true">⋮</span></div>
    <div className="ux-workspace">
      <header className="ux-topbar"><span>NAPMS / UI Baseline v0.2</span><strong>RESEARCH / MOCK</strong><span>Фиктивные данные · Simulation · без API</span></header>
      <main className="ux-main">{children}</main>
    </div>
  </div>
}
