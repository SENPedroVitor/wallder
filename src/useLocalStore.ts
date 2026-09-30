import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'

// All writers use the same origin-wide lock and read again inside the transaction.
// React effects never write a stale render snapshot back to storage.
export function useLocalStore<T>(key: string, load: () => T) {
  const loader = useRef(load); loader.current = load
  const [value, setValue] = useState(load)
  const [error, setError] = useState(false)
  const current = useRef(value); current.current = value
  const queue = useRef(Promise.resolve())
  useEffect(() => {
    const refresh = (event: StorageEvent | Event) => {
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
    const optimistic = apply(current.current); current.current = optimistic; setValue(optimistic)
    const commit = () => {
      try {
        const latest = localStorage.getItem(key) === null ? current.current : loader.current()
        // An absent store already contains the optimistic mutation in current.
        const next = localStorage.getItem(key) === null ? optimistic : apply(latest)
        localStorage.setItem(key, JSON.stringify(next)); current.current = next; setValue(next); setError(false)
        window.dispatchEvent(new Event(`wendler:store:${key}`))
      } catch { setError(true) }
    }
    queue.current = queue.current.then(() => navigator.locks ? navigator.locks.request('wendler:data', commit) : commit()).catch(() => setError(true))
  }, [key])
  return [value, update, error] as const
}
