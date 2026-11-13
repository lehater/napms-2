import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/badge'

export type DetailTab = { id: string; label: string; href: string }
type DetailViewProps = {
  breadcrumbs: ReactNode
  title: string
  subtitle?: ReactNode
  state?: string
  actions?: ReactNode
  tabs: DetailTab[]
  activeTab: string
  children: ReactNode
}

export function DetailView({ breadcrumbs, title, subtitle, state, actions, tabs, activeTab, children }: DetailViewProps) {
  return <>
    <nav className="ux-breadcrumbs" aria-label="Breadcrumbs">{breadcrumbs}</nav>
    <header className="ux-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="flex flex-wrap items-center gap-2">{state && <Badge variant="outline">{state}</Badge>}{actions}</div></div></header>
    <nav className="ux-tabs" aria-label="Разделы объекта">{tabs.map(tab => <Link key={tab.id} to={tab.href} aria-current={activeTab === tab.id ? 'page' : undefined}>{tab.label}</Link>)}</nav>
    <section className="ux-panel ux-panel-body">{children}</section>
  </>
}
