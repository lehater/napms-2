export type DeploymentOption = { deploymentId: string; componentId: string; resourceId: string }
export type Options = (NeedPage<NeedOption> & {kind: 'revisions'}) | (NeedPage<DeploymentOption> & {kind: 'source-deployments' | 'destination-deployments'})
export type Rule = { ruleId: string; subjectId: string; state: 'ACTIVE' | 'INACTIVE'; subject: Omit<AccessInput, 'connectivityNeedId'>; originatingRequest: AccessRequest; originatingDecision: Decision; connectivityNeedId: string; allowances: Decision[] }
export type Need = { connectivityNeedId: string; processId: string; interactionId: string; componentId: string }
export type NeedOption = { interactionRevisionId: string; interactionId: string; applicationId: string; sourceComponentId: string; destinationComponentId: string; ipProtocol: string; destinationPortStart: number; destinationPortEnd: number }
export type NeedPage<T> = { items: T[]; limit: number; offset: number; hasMore: boolean }
export type BusinessProcess = { processId: string; name: string | null; description: string | null; responsibleOrganization: string | null }
export type ProcessInput = { name: string; description: string | null; responsibleOrganization: string | null }
export type ProcessCollection = { items: BusinessProcess[]; limit: number; offset: number; hasMore: boolean }
export type Outcome = 'ALLOWED' | 'DENIED'
export type AccessInput = {
  sourceDeploymentId: string
  destinationDeploymentId: string
  interactionRevisionId: string
  connectivityNeedId: string
}
export type Decision = {
  decisionId: string; requestId: string; outcome: Outcome
  deciderActorId: string; decidedAt: string; policyRuleId: string | null
}
export type AccessRequest = {
  requestId: string; subjectId: string; status: 'PENDING' | Outcome
  connectivityNeedId: string; subject: Omit<AccessInput, 'connectivityNeedId'>
  submittedAt: string; requesterActorId: string
  admission: { sourceResourceId: string; grantId: string; checkedAt: string }
  decision: Decision | null
}
export type Collection = { items: AccessRequest[]; limit: number; offset: number; hasMore: boolean }
export class ApiError extends Error {
  constructor(public status: number, public code: string, public localDemo = false) { super(code) }
}
export function message(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Сеть недоступна. Повторите после запуска локального API.'
  if (error.localDemo && error.status === 401) return '401 · Требуется авторизация. Выберите Demo actor.'
  if (error.localDemo && error.status === 403) return '403 · Недостаточно полномочий у выбранного Demo actor.'
  switch (error.status) {
    case 401: return '401 · Credential недействителен или истёк. Введите действующий token.'
    case 403: return '403 · Недостаточно полномочий. Проверьте token и серверные права.'
    case 400: case 422: return 'Некорректная заявка. Проверьте четыре UUID и их связи.'
    case 404: return 'Заявка или связанный объект не найдены.'
    case 409: return 'Для заявки уже принято решение. Серверный статус обновлён.'
    default: return 'API не смог выполнить операцию. Повторите попытку.'
  }
}
export function api(token: string, unauthenticated: () => void, demoActor?: string) {
  async function call<T>(path: string, method = 'GET', body?: unknown, raw = false): Promise<T> {
    const response = await fetch(path, {
      method, cache: 'no-store',
      headers: { Accept: 'application/json', ...(demoActor === undefined ? { Authorization: `Bearer ${token}` } : { 'X-NAPMS-Dev': '1', 'X-NAPMS-Demo-Actor': demoActor }), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) {
      // Only consume the standardized code. Never render/log arbitrary server input.
      const payload = await response.json().catch(() => null)
      if (response.status === 401) unauthenticated()
      throw new ApiError(response.status, typeof payload?.error?.code === 'string' ? payload.error.code : 'API_ERROR', demoActor !== undefined)
    }
    return (raw ? response.blob() : response.json()) as Promise<T>
  }
  return {
    rule: (id: string) => call<Rule>(`/policy-rules/${encodeURIComponent(id)}`),
    download: (id: string, format: 'json' | 'csv') => call<Blob>(`/policy/export?ruleId=${encodeURIComponent(id)}&format=${format}`, 'GET', undefined, true),
    requestOptions: (pid: string, nid: string, kind: Options['kind'], revision = '', offset = 0) => call<Options>(`/business-processes/${encodeURIComponent(pid)}/needs/${encodeURIComponent(nid)}/access-request-options?kind=${kind}&limit=20&offset=${offset}${revision ? '&interactionRevisionId=' + encodeURIComponent(revision) : ''}`),
    needs: (id: string, offset = 0) => call<NeedPage<Need>>(`/business-processes/${encodeURIComponent(id)}/needs?limit=20&offset=${offset}`),
    needOptions: (id: string, offset = 0) => call<NeedPage<NeedOption>>(`/business-processes/${encodeURIComponent(id)}/need-options?limit=20&offset=${offset}`),
    createNeed: (id: string, revision: string) => call<Need>(`/business-processes/${encodeURIComponent(id)}/needs`, 'POST', { interactionRevisionId: revision }),
    processes: (offset = 0) => call<ProcessCollection>(`/business-processes?limit=20&offset=${offset}`),
    process: (id: string) => call<BusinessProcess>(`/business-processes/${encodeURIComponent(id)}`),
    createProcess: (data: ProcessInput) => call<BusinessProcess>('/business-processes', 'POST', data),
    list: (offset = 0) => call<Collection>(`/access-requests?limit=20&offset=${offset}`),
    request: (id: string) => call<AccessRequest>(`/access-requests/${encodeURIComponent(id)}`),
    create: (data: AccessInput) => call<AccessRequest>('/access-requests', 'POST', data),
    decide: (id: string, outcome: Outcome) => call<Decision>(`/access-requests/${encodeURIComponent(id)}/decision`, 'POST', { outcome }),
  }
}
export type Client = ReturnType<typeof api>
