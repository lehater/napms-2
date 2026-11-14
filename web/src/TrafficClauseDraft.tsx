import { Button } from './components/ui/button'
import { type TrafficClauseInput, type TrafficClause } from './api'

export type ClauseDraft = {
  ipProtocol: 'TCP' | 'UDP'
  sourcePortStart: string
  sourcePortEnd: string
  destinationPortStart: string
  destinationPortEnd: string
}

export const emptyClause = (): ClauseDraft => ({
  ipProtocol: 'TCP', sourcePortStart: '', sourcePortEnd: '',
  destinationPortStart: '443', destinationPortEnd: '443',
})

export function draftFromClause(clause: TrafficClause): ClauseDraft {
  return {
    ipProtocol: clause.ipProtocol,
    sourcePortStart: clause.sourcePortStart === null ? '' : String(clause.sourcePortStart),
    sourcePortEnd: clause.sourcePortEnd === null ? '' : String(clause.sourcePortEnd),
    destinationPortStart: String(clause.destinationPortStart),
    destinationPortEnd: String(clause.destinationPortEnd),
  }
}

export function parseClause(item: ClauseDraft): TrafficClauseInput {
  if ((item.sourcePortStart === '') !== (item.sourcePortEnd === '')) {
    throw new Error('Укажите обе границы исходного диапазона либо оставьте обе пустыми (ANY).')
  }
  const sourcePortStart = item.sourcePortStart === '' ? null : Number(item.sourcePortStart)
  const sourcePortEnd = item.sourcePortEnd === '' ? null : Number(item.sourcePortEnd)
  const destinationPortStart = Number(item.destinationPortStart)
  const destinationPortEnd = Number(item.destinationPortEnd)
  if (!Number.isInteger(destinationPortStart) || !Number.isInteger(destinationPortEnd)
      || destinationPortStart < 1 || destinationPortEnd > 65535 || destinationPortStart > destinationPortEnd
      || (sourcePortStart !== null && (!Number.isInteger(sourcePortStart)
          || !Number.isInteger(sourcePortEnd) || sourcePortStart < 1
          || sourcePortEnd === null || sourcePortEnd > 65535 || sourcePortStart > sourcePortEnd))) {
    throw new Error('Укажите корректные диапазоны портов от 1 до 65535.')
  }
  return { ipProtocol: item.ipProtocol, sourcePortStart, sourcePortEnd,
    destinationPortStart, destinationPortEnd }
}

export function ClauseFields({ item, index, change, remove }: {
  item: ClauseDraft
  index: number
  change: (next: ClauseDraft) => void
  remove: () => void
}) {
  const key = index + 1
  return <fieldset className="interaction-clause-draft">
    <legend>TrafficClause #{key}</legend>
    <label>Протокол<select aria-label={`Протокол условия ${key}`} value={item.ipProtocol}
      onChange={event => change({ ...item, ipProtocol: event.target.value as 'TCP' | 'UDP' })}>
      <option value="TCP">TCP</option><option value="UDP">UDP</option>
    </select></label>
    <label>Источник от<input aria-label={`Источник от ${key}`} placeholder="ANY" type="number" min={1} max={65535}
      value={item.sourcePortStart} onChange={event => change({ ...item, sourcePortStart: event.target.value })}/></label>
    <label>Источник до<input aria-label={`Источник до ${key}`} placeholder="ANY" type="number" min={1} max={65535}
      value={item.sourcePortEnd} onChange={event => change({ ...item, sourcePortEnd: event.target.value })}/></label>
    <label>Назначение от<input aria-label={`Назначение от ${key}`} required type="number" min={1} max={65535}
      value={item.destinationPortStart} onChange={event => change({ ...item, destinationPortStart: event.target.value })}/></label>
    <label>Назначение до<input aria-label={`Назначение до ${key}`} required type="number" min={1} max={65535}
      value={item.destinationPortEnd} onChange={event => change({ ...item, destinationPortEnd: event.target.value })}/></label>
    <Button type="button" variant="outline" onClick={remove} aria-label={`Удалить условие ${key}`}>Удалить</Button>
  </fieldset>
}

