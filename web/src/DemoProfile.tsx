import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type Client } from './api'

type Actor = 'anonymous' | 'requester' | 'decider' | 'exporter'
const Context = createContext<{ enabled: boolean; actor: Actor; client: Client | null; setActor: (actor: Actor) => void; ready: boolean; error: string }>({ enabled: false, actor: 'anonymous', client: null, setActor: () => {}, ready: false, error: '' })
export const useDemoProfile = () => useContext(Context)

export function DemoProfile({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<Actor>('anonymous'), [ready, setReady] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    if (!__NAPMS_LOCAL_DEMO__) return
    let active = true
    fetch('/__napms_dev/profile', { headers: { 'X-NAPMS-Dev': '1' }, cache: 'no-store' }).then(async response => {
      if (!response.ok || !(await response.json()).enabled) throw new Error('unavailable')
      if (active) setReady(true)
    }).catch(() => { if (active) setError('Прокси local-demo недоступен. Перезапустите команду local-demo.') })
    return () => { active = false }
  }, [])
  const client = useMemo(() => __NAPMS_LOCAL_DEMO__ ? api('', () => {}, actor) : null, [actor])
  if (!__NAPMS_LOCAL_DEMO__) return <>{children}</>
  return <Context.Provider value={{ enabled: true, actor, client, setActor, ready, error }}>{children}</Context.Provider>
}
export function DemoActor() {
  const { enabled, actor, setActor, ready, error } = useDemoProfile()
  if (!enabled) return null
  return <section aria-label="Local demo profile" className="nid-role">
    {error ? <p role="alert">{error}</p> : !ready ? <p role="status">Проверка local-demo…</p> : <label>Demo actor <select aria-label="Demo actor" value={actor} onChange={e => setActor(e.target.value as Actor)}>
      <option value="anonymous">Без авторизации · 401</option><option value="requester">Requester</option><option value="decider">Decider</option><option value="exporter">Exporter</option>
    </select></label>}
  </section>
}
