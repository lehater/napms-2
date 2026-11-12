import { createContext, useContext, useRef, useState, type ReactNode, type SetStateAction } from 'react'
import { useDemoProfile } from './DemoProfile'

// The provider is remounted on Demo actor changes. Never persist credentials or
// carry a manual-token draft across the loss of its authenticated route session.
const Context = createContext<Map<string, unknown> | null>(null)
export function FormDrafts({ children }: { children: ReactNode }) {
  const drafts = useRef(new Map<string, unknown>())
  return <Context.Provider value={drafts.current}>{children}</Context.Provider>
}
export function useFormDraft<T>(key: string, initial: T) {
  const context = useContext(Context)
  const { enabled } = useDemoProfile()
  const drafts = enabled ? context : null
  const [value, setValue] = useState<T>(() => drafts?.has(key) ? drafts.get(key) as T : initial)
  function update(next: SetStateAction<T>) {
    setValue(previous => {
      const result = typeof next === 'function' ? (next as (value: T) => T)(previous) : next
      drafts?.set(key, result)
      return result
    })
  }
  function clear() { drafts?.delete(key); setValue(initial) }
  return [value, update, clear] as const
}
