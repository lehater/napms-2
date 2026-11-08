import { createContext, useContext, useState, type ReactNode } from 'react'
import { objects, type MockObject } from './data'

export type Subject = { sourceDeploymentId: string; destinationDeploymentId: string; interactionRevisionId: string }
export const subjectKey = (s: Subject) => JSON.stringify([s.sourceDeploymentId, s.destinationDeploymentId, s.interactionRevisionId])
const originalSubject: Subject = { sourceDeploymentId: 'mock-deployment-order', destinationDeploymentId: 'mock-deployment-ledger', interactionRevisionId: 'mock-revision' }
export type SimulationState = { requests: MockObject[]; rules: MockObject[] }
export const emptySimulation: SimulationState = { requests: [], rules: [] }
export function submit(state: SimulationState, subject: Subject, needId: string): [SimulationState, string] {
  const get = (id: string) => objects.find(o => o.id === id)
  const source = get(subject.sourceDeploymentId), destination = get(subject.destinationDeploymentId), revision = get(subject.interactionRevisionId), need = get(needId)
  const interaction = revision && get(revision.fields.interaction)
  if (source?.kind !== 'ComponentDeployment' || destination?.kind !== 'ComponentDeployment' || revision?.kind !== 'InteractionRevision' || need?.kind !== 'ConnectivityNeed' || !interaction || !need.links.some(l => l.id === interaction.id) || source.fields.component !== interaction.fields.sourceComponent || destination.fields.component !== interaction.fields.destinationComponent || ![source, destination].every(d => d.links.some(l => interaction.links.some(p => p.id === l.id && get(p.id)?.kind === 'Application')))) throw Error('Компоненты не соответствуют направлению InteractionRevision / ConnectivityNeed.')
  const id = `mock-simulation-request-${state.requests.length + 1}`
  const request: MockObject = { id, kind: 'AccessRequest', section: 'requests', name: `Simulation Q${state.requests.length + 1}`, state: 'PENDING', summary: 'MOCK · заявка симуляции', fields: { ...subject, connectivityNeedId: needId, subject: subjectKey(subject), requester: 'MOCK requester', submittedAt: new Date().toISOString() }, links: [{ label: 'Источник', id: source.id }, { label: 'Получатель', id: destination.id }, { label: 'Revision', id: revision.id }, { label: 'Need', id: need.id }, ...need.links.filter(l => get(l.id)?.kind === 'BusinessProcess')] }
  return [{ ...state, requests: [...state.requests, request] }, id]
}
export function decide(state: SimulationState, id: string, outcome: 'ALLOWED' | 'DENIED'): SimulationState {
  const request = state.requests.find(r => r.id === id)
  if (!request || request.state !== 'PENDING') throw Error('Решение уже завершено или заявка не принадлежит Simulation.')
  const key = request.fields.subject
  const existing = key === subjectKey(originalSubject) ? objects.find(o => o.id === 'mock-rule') : state.rules.find(r => r.fields.subject === key)
  const ruleId = outcome === 'ALLOWED' ? existing?.id ?? `mock-simulation-rule-${state.rules.length + 1}` : 'null'
  const decisionId = `${id}-decision`
  const completed: MockObject = { ...request, state: outcome, fields: { ...request.fields, decisionId, decisionOutcome: outcome, decider: 'MOCK decider', decisionAt: new Date().toISOString(), policyRuleId: ruleId }, links: [...request.links, ...(outcome === 'ALLOWED' ? [{ label: 'PolicyRule', id: ruleId }] : [])] }
  const rule: MockObject = { id: ruleId, kind: 'PolicyRule', section: 'policy', name: `Simulation P${state.rules.length + 1}`, state: 'Active', summary: 'MOCK · декларативное разрешение, не настройка сети', fields: { subject: key, effect: 'PERMIT only', RuleAuthorizationEvidence: `${decisionId} · ALLOWED · origin ${id}` }, links: [...request.links, { label: 'Origin ALLOWED', id }] }
  return { requests: state.requests.map(r => r.id === id ? completed : r), rules: outcome === 'ALLOWED' && !existing ? [...state.rules, rule] : state.rules }
}
export function simulationObjects(state: SimulationState): readonly MockObject[] {
  const all = [...objects, ...state.requests, ...state.rules]
  return all.map(object => {
    const backlinks = state.requests.filter(r => r.links.some(l => l.id === object.id)).map(r => ({ label: r.state === 'ALLOWED' ? 'ALLOWED provenance' : 'Заявка', id: r.id }))
    return backlinks.length ? { ...object, links: [...object.links, ...backlinks.filter(l => !object.links.some(old => old.id === l.id))] } : object
  })
}
const Context = createContext<{ objects: readonly MockObject[]; create: (s: Subject, need: string) => string; decision: (id: string, outcome: 'ALLOWED' | 'DENIED') => void } | null>(null)
export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(emptySimulation)
  return <Context.Provider value={{ objects: simulationObjects(state), create: (subject, need) => { const [next, id] = submit(state, subject, need); setState(next); return id }, decision: (id, outcome) => setState(s => decide(s, id, outcome)) }}>{children}</Context.Provider>
}
export function useSimulation() { const context = useContext(Context); if (!context) throw Error('SimulationProvider missing'); return context }
