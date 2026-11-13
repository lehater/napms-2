import type { ReactNode } from 'react'

export type Column<T> = { key: string; title: string; render: (row: T) => ReactNode }

type EntityTableProps<T> = {
  rows: T[]
  columns: Column<T>[]
  getKey: (row: T) => string
  emptyText: string
  loading?: boolean
  error?: string
}

export function EntityTable<T>({ rows, columns, getKey, emptyText, loading = false, error = '' }: EntityTableProps<T>) {
  const message = error || (loading ? 'Загрузка…' : rows.length ? '' : emptyText)
  return <div className="ux-table-scroll"><table className="ux-table">
    <thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.title}</th>)}</tr></thead>
    <tbody>{message ? <tr><td className="ux-empty" colSpan={Math.max(1, columns.length)} role={error ? 'alert' : loading ? 'status' : undefined}>{message}</td></tr> : rows.map(row => <tr key={getKey(row)}>{columns.map(column => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody>
  </table></div>
}
