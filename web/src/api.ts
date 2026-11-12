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
  submittedAt: string; requesterActorId: string
  admission: { sourceResourceId: string; grantId: string; checkedAt: string }
  decision: Decision | null
}
export type Collection = { items: AccessRequest[]; limit: number; offset: number; hasMore: boolean }
export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}
export function message(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Network unavailable. Retry when the local API is running.'
  switch (error.status) {
    case 401: return 'Credential expired or invalid. Enter a valid token again.'
    case 403: return 'Permission denied by the server. Check the token and grants.'
    case 400: case 422: return 'Invalid request. Check the four UUID references and their relationship.'
    case 404: return 'Request or referenced object not found.'
    case 409: return 'This request already has a decision. The stored status has been reloaded.'
    default: return 'The API could not complete the operation. Please retry.'
  }
}
export function api(token: string, unauthenticated: () => void) {
  async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(path, {
      method, cache: 'no-store',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) {
      // Only consume the standardized code. Never render/log arbitrary server input.
      const payload = await response.json().catch(() => null)
      if (response.status === 401) unauthenticated()
      throw new ApiError(response.status, typeof payload?.error?.code === 'string' ? payload.error.code : 'API_ERROR')
    }
    return response.json() as Promise<T>
  }
  return {
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
