import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { isSyncedKey, syncMutation, keepUnsaved } from './syncedStore'

// All writers use the same origin-wide lock and read again inside the transaction.
// React effects never write a stale render snapshot back to storage.
export function useLocalStore<T>(key: string, load: () => T) {
  const loader = useRef(load); loader.current = load
  const [value, setValue] = useState(load)
  const [error, setError] = useState(false)
  const current = useRef(value); current.current = value
  const queue = useRef(Promise.resolve())
  const pending = useRef(0)
  useEffect(() => {
    const refresh = (event: StorageEvent | Event) => {
      if (pending.current) return
      if (event instanceof StorageEvent && event.key !== key && event.key !== null) return
      const next = loader.current(); current.current = next; setValue(next)
    }
    window.addEventListener('storage', refresh)
    window.addEventListener(`wendler:store:${key}`, refresh)
    const fail = () => setError(true)
    window.addEventListener('wendler:save-error', fail)
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener(`wendler:store:${key}`, refresh); window.removeEventListener('wendler:save-error', fail) }
  }, [key])
  const update = useCallback((action: SetStateAction<T>) => {
    const apply = (previous: T) => typeof action === 'function' ? (action as (value: T) => T)(previous) : action
    pending.current += 1
    const optimistic = apply(current.current); current.current = optimistic; setValue(optimistic)
    const commit = async () => {
      try {
        if (isSyncedKey(key)) {
          let next: T
          for (;;) {
            try { next = await syncMutation(key, apply, loader.current); break }
            catch { try { keepUnsaved(key, current.current) } catch {}; setError(true); await new Promise(resolve => setTimeout(resolve, 10000)) }
          }
          if (pending.current === 1) { current.current = next; setValue(next) }; setError(false)
          return
        }
        const latest = localStorage.getItem(key) === null ? current.current : loader.current()
        // An absent store already contains the optimistic mutation in current.
        const next = localStorage.getItem(key) === null ? optimistic : apply(latest)
        localStorage.setItem(key, JSON.stringify(next)); if (pending.current === 1) { current.current = next; setValue(next) }; setError(false)
        window.dispatchEvent(new Event(`wendler:store:${key}`))
      } catch { if (isSyncedKey(key)) { try { keepUnsaved(key, current.current) } catch {} }; setError(true) }
    }
    queue.current = queue.current.then(async () => { try { if (isSyncedKey(key)) await commit(); else if (navigator.locks) await navigator.locks.request('wendler:data', async () => { await commit() }); else await commit() } finally { pending.current -= 1 } }).catch(() => setError(true))
  }, [key])
  return [value, update, error] as const
}
