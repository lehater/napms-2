import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type Client } from './api'

type Actor = 'anonymous' | 'requester' | 'decider' | 'exporter'
const Context = createContext<{ enabled: boolean; actor: Actor; client: Client | null }>({ enabled: false, actor: 'anonymous', client: null })
export const useDemoProfile = () => useContext(Context)

export function DemoProfile({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<Actor>('anonymous'), [ready, setReady] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    if (!__NAPMS_LOCAL_DEMO__) return
    let active = true
    fetch('/__napms_dev/profile', { headers: { 'X-NAPMS-Dev': '1' }, cache: 'no-store' }).then(async response => {
      if (!response.ok || !(await response.json()).enabled) throw new Error('unavailable')
      if (active) setReady(true)
    }).catch(() => { if (active) setError('Local demo proxy unavailable. Restart the explicit local-demo command.') })
    return () => { active = false }
  }, [])
  const client = useMemo(() => __NAPMS_LOCAL_DEMO__ ? api('', () => {}, actor) : null, [actor])
  if (!__NAPMS_LOCAL_DEMO__) return <>{children}</>
  return <Context.Provider value={{ enabled: true, actor, client }}>
    <section aria-label="Local demo profile" className="border-b bg-amber-50 p-3 text-sm">
      <strong>LOCAL DEMO · REAL API actor</strong>{' '}
      {error ? <p role="alert">{error}</p> : !ready ? <p role="status">Checking local demo proxy…</p> : <>
        <label htmlFor="demo-actor">Demo actor </label><select id="demo-actor" value={actor} onChange={e => setActor(e.target.value as Actor)}>
          <option value="anonymous">Без авторизации · настоящий 401</option><option value="requester">Requester</option><option value="decider">Decider</option><option value="exporter">Exporter</option>
        </select><p>Полномочия проверяет FastAPI. MOCK Simulation имеет отдельную роль. Выбор сбрасывается при обновлении страницы.</p>
      </>}
    </section>
    {ready && <div key={actor}>{children}</div>}
  </Context.Provider>
}
