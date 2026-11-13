import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './baseline.css'

// Preserve the existing stored width preference across the UI navigation cleanup.
const sidebarWidthKey = 'napms.prototype.sidebarWidth'
const clamp = (width: number) => Math.min(360, Math.max(200, width))
export function Frame({ children, navigation, header, home = '/', real = false }: { children: ReactNode; navigation: ReactNode; header: ReactNode; home?: string; real?: boolean }) {
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  useLayoutEffect(() => {
    setMenuOpen(false)
    main.current?.scrollTo(0, 0); window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])
  useLayoutEffect(() => {
    const update = () => {
      const heading = main.current?.querySelector('h1')
      document.title = `${heading?.textContent?.trim() || 'NAPMS'} — NAPMS`
    }
    update()
    const observer = new MutationObserver(update)
    if (main.current) observer.observe(main.current, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [pathname])
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
    <a className="ux-skip-link" href="#main-content" onClick={event => { event.preventDefault(); setMenuOpen(false); main.current?.focus() }}>Перейти к содержимому</a>
    <div className="ux-mobile-navigation"><strong>NAPMS</strong><button ref={menuButton} aria-controls="napms-sidebar" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? 'Закрыть меню' : 'Открыть меню'}</button></div>
    <aside id="napms-sidebar" className="ux-sidebar" data-open={menuOpen} onKeyDown={event => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus() } }}>
      <Link to={home} className="ux-brand"><span className="ux-brand-icon">N</span><span><strong>NAPMS 2.0</strong><small>Network Access Policy Management</small></span></Link>
      {navigation}
    </aside>
    <div className="ux-sizer" role="separator" aria-controls="napms-sidebar" aria-label="Sidebar width" aria-orientation="vertical" aria-valuemin={200} aria-valuemax={360} aria-valuenow={width} tabIndex={0}
      onKeyDown={event => {
        const next = event.key === 'Home' ? 200 : event.key === 'End' ? 360 : event.key === 'ArrowLeft' ? width - (event.shiftKey ? 50 : 10) : event.key === 'ArrowRight' ? width + (event.shiftKey ? 50 : 10) : undefined
        if (next !== undefined) { event.preventDefault(); resize(next) }
      }}
      onPointerDown={event => { if (event.button === 0) { event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus() } }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event.clientX) }}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}><span aria-hidden="true">⋮</span></div>
    <div className="ux-workspace"><header className="ux-topbar">{header}</header><main id="main-content" tabIndex={-1} ref={main} className={real ? 'ux-main ux-real' : 'ux-main'}>{children}</main></div>
  </div>
}
