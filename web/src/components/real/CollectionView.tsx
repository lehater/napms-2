import type { ReactNode } from 'react'
import { Button } from '../ui/button'
import { EntityTable, type Column } from './EntityTable'

type CollectionViewProps<T> = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  rows: T[]
  columns: Column<T>[]
  getKey: (row: T) => string
  emptyText: string
  loading?: boolean
  error?: string
  offset?: number
  limit?: number
  hasMore?: boolean
  onPrevious?: () => void
  onNext?: () => void
  onRefresh?: () => void
}

export function CollectionView<T>({ title, description, actions, rows, columns, getKey, emptyText, loading, error, offset, limit, hasMore, onPrevious, onNext, onRefresh }: CollectionViewProps<T>) {
  const paged = limit !== undefined && offset !== undefined
  return <>
    <header className="ux-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h1>{title}</h1>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>{description && <p>{description}</p>}</header>
    <section className="ux-collection" aria-label={title}>
      <EntityTable rows={rows} columns={columns} getKey={getKey} emptyText={emptyText} loading={loading} error={error} />
      <footer className="ux-pagination"><div>{onRefresh && <Button type="button" variant="outline" onClick={onRefresh}>{error ? 'Повторить' : 'Обновить'}</Button>}{paged && <span>Страница {Math.floor(offset / limit) + 1}</span>}</div>{paged && <div><Button type="button" variant="outline" disabled={loading || offset === 0} onClick={onPrevious}>Назад</Button><Button type="button" variant="outline" disabled={loading || !hasMore} onClick={onNext}>Далее</Button></div>}</footer>
    </section>
  </>
}
