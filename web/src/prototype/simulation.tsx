import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { objects, type MockObject } from './data'

export type Subject = { sourceDeploymentId: string; destinationDeploymentId: string; interactionRevisionId: string }
export type Scenario = 'A' | 'B' | 'C'
export type Outcome = 'ALLOWED' | 'DENIED'
export type MockRole = 'Requester' | 'Decider' | 'Policy Viewer'
export const subjectKey = (s: Subject) => JSON.stringify([s.sourceDeploymentId, s.destinationDeploymentId, s.interactionRevisionId])
export const originalSubject: Subject = { sourceDeploymentId: 'mock-deployment-order', destinationDeploymentId: 'mock-deployment-ledger', interactionRevisionId: 'mock-revision' }
export const newSubject: Subject = { ...originalSubject, destinationDeploymentId: 'mock-deployment-ledger-2' }
export function subjectOf(object: MockObject): Subject | undefined {
  if (object.id === 'mock-rule') return originalSubject
  const field = (key: string, label: string) => object.fields[key] ?? object.links.find(l => l.label === label)?.id
  const sourceDeploymentId = field('sourceDeploymentId', 'Источник'), destinationDeploymentId = field('destinationDeploymentId', 'Получатель'), interactionRevisionId = field('interactionRevisionId', 'Revision')
  return sourceDeploymentId && destinationDeploymentId && interactionRevisionId ? { sourceDeploymentId, destinationDeploymentId, interactionRevisionId } : undefined
}
export function subjectLabel(subject: Subject): string {
  const get = (id: string) => objects.find(o => o.id === id)
  return '(' + (get(subject.sourceDeploymentId)?.name ?? '—') + ', ' + (get(subject.destinationDeploymentId)?.name ?? '—') + ', ' + (get(subject.interactionRevisionId)?.fields.revision.split(' ')[0] ?? '—') + ')'
}
export function validateSubject(subject: Subject, needId: string, scenario: Scenario = 'A') {
  const get = (id: string) => objects.find(o => o.id === id)
  const source = get(subject.sourceDeploymentId), destination = get(subject.destinationDeploymentId), revision = get(subject.interactionRevisionId), need = get(needId)
  const interaction = revision && get(revision.fields.interaction)
  if (scenario === 'C') throw Error('В сценарном наборе C нет совместимого destination Deployment.')
  if (source?.kind !== 'ComponentDeployment' || destination?.kind !== 'ComponentDeployment' || revision?.kind !== 'InteractionRevision' || need?.kind !== 'ConnectivityNeed' || !interaction || !need.links.some(l => l.id === interaction.id) || source.fields.component !== interaction.fields.sourceComponent || destination.fields.component !== interaction.fields.destinationComponent || ![source, destination].every(d => d.links.some(l => interaction.links.some(p => p.id === l.id && get(p.id)?.kind === 'Application')))) throw Error('Компоненты не соответствуют направлению InteractionRevision / ConnectivityNeed.')
  return { source, destination, revision, need }
}
export type SimulationState = { requests: MockObject[]; rules: MockObject[] }
export const emptySimulation: SimulationState = { requests: [], rules: [] }
export function submit(state: SimulationState, subject: Subject, needId: string, scenario: Scenario = 'A'): [SimulationState, string] {
  const { source, destination, revision, need } = validateSubject(subject, needId, scenario)
  const id = 'mock-simulation-request-' + (state.requests.length + 1)
  const request: MockObject = { id, kind: 'AccessRequest', section: 'requests', name: 'Q' + (state.requests.length + 3) + ' · запись проводки', state: 'PENDING', summary: 'MOCK · самостоятельная заявка, решение ещё не принято', fields: { ...subject, connectivityNeedId: needId, subject: subjectKey(subject), requester: 'alice-orders', submittedAt: new Date().toISOString(), RequestAuthorityEvidence: 'MOCK access.request на исходный Resource; destination grant для подачи не требуется' }, links: [{ label: 'Источник', id: source.id }, { label: 'Получатель', id: destination.id }, { label: 'Revision', id: revision.id }, { label: 'Need', id: need.id }, ...need.links.filter(l => objects.find(o => o.id === l.id)?.kind === 'BusinessProcess')] }
  return [{ ...state, requests: [...state.requests, request] }, id]
}
export function decide(state: SimulationState, id: string, outcome: Outcome): SimulationState {
  const request = state.requests.find(r => r.id === id)
  if (!request || request.state !== 'PENDING') throw Error('Решение уже завершено. Повторное или конкурентное подтверждение отклонено.')
  const key = request.fields.subject
  const existing = key === subjectKey(originalSubject) ? objects.find(o => o.id === 'mock-rule') : state.rules.find(r => r.fields.subject === key)
  const ruleId = outcome === 'ALLOWED' ? existing?.id ?? 'mock-simulation-rule-' + (state.rules.length + 1) : 'null'
  const decisionId = id + '-decision'
  const completed: MockObject = { ...request, state: outcome, fields: { ...request.fields, decisionId, decisionOutcome: outcome, decider: 'bob-policy', decisionAt: new Date().toISOString(), policyRuleId: ruleId }, links: [...request.links, ...(outcome === 'ALLOWED' ? [{ label: 'PolicyRule', id: ruleId }] : [])] }
  const rule: MockObject = { id: ruleId, kind: 'PolicyRule', section: 'policy', name: 'P' + (state.rules.length + 2) + ' · OrderClient → LedgerApi', state: 'Active', summary: 'MOCK · декларированное разрешение, не подтверждение сетевой доступности', fields: { ...subjectOf(request)!, subject: key, effect: 'PERMIT only', RuleAuthorizationEvidence: decisionId + ' · ALLOWED · origin ' + id }, links: [...request.links, { label: 'Origin ALLOWED', id }] }
  return { requests: state.requests.map(r => r.id === id ? completed : r), rules: outcome === 'ALLOWED' && !existing ? [...state.rules, rule] : state.rules }
}
export function simulationObjects(state: SimulationState): readonly MockObject[] {
  const all = [...state.requests].reverse().concat(objects, state.rules)
  return all.map(object => {
    const backlinks = state.requests.filter(r => r.links.some(l => l.id === object.id)).map(r => ({ label: r.state === 'ALLOWED' ? 'ALLOWED provenance' : 'Заявка', id: r.id }))
    return backlinks.length ? { ...object, links: [...object.links, ...backlinks.filter(l => !object.links.some(old => old.id === l.id))] } : object
  })
}
type Simulation = { objects: readonly MockObject[]; role: MockRole; resetVersion: number; setRole: (role: MockRole) => void; reset: () => void; create: (s: Subject, need: string, scenario?: Scenario) => string; decision: (id: string, outcome: Outcome) => void }
const Context = createContext<Simulation | null>(null)
export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(emptySimulation), latest = useRef(state)
  const [role, setRole] = useState<MockRole>('Requester')
  const [resetVersion, setResetVersion] = useState(0)
  const commit = (next: SimulationState) => { latest.current = next; setState(next) }
  return <Context.Provider value={{ objects: simulationObjects(state), role, resetVersion, setRole,
    reset: () => { commit(emptySimulation); setRole('Requester'); setResetVersion(v => v + 1) },
    create: (subject, need, scenario) => {
      if (role !== 'Requester') throw Error('Подача доступна только в mock-контексте Requester.')
      const [next, id] = submit(latest.current, subject, need, scenario); commit(next); return id
    },
    // Synchronous validation also rejects two confirmations before a React render.
    decision: (id, outcome) => {
      if (role !== 'Decider') throw Error('Решение доступно только в mock-контексте Decider.')
      commit(decide(latest.current, id, outcome))
    },
  }}>{children}</Context.Provider>
}
export function useSimulation() { const context = useContext(Context); if (!context) throw Error('SimulationProvider missing'); return context }
