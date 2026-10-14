export const syncedKeys = ['waddle:records:v1', 'wendler:frontend:v1', 'wendler:linked-mini-chats:v2', 'wendler:tasks:v1', 'wendler:context-links:v1', 'wendler:plugins:v1'] as const
import { recoverRecords } from './recordRecovery.ts'
const active = new Map<string, number>()
const revisions = new Map<string, number>()
let initialized = false
let bootstrap: Promise<void> | undefined
const dirtyKey = (key: string) => `wendler:unsaved:${key}`
function cache(key: string, value: unknown) { if (value === null || value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)) }
async function records(key?: string): Promise<Record<string, { revision: number; value: unknown }>> {
  const response = await fetch(`/api/storage${key ? `?key=${encodeURIComponent(key)}` : ''}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Não foi possível carregar seu histórico. Tente novamente.')
  return (await response.json()).records
}
async function write(key: string, value: unknown, revision: number) {
  const response = await fetch('/api/storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value, revision }) })
  if (response.status === 409) return null
  if (!response.ok) throw new Error('Não foi possível sincronizar. Sua alteração continua neste navegador.')
  return await response.json() as { revision: number; value: unknown }
}
export function isSyncedKey(key: string) { return syncedKeys.some(item => item === key) }
export async function saveRestoredStores(stores: Record<string, unknown>) {
  if (!initialized) return
  for (const key of syncedKeys) await syncMutation(key, () => stores[key] ?? null, () => null)
}
export function initializeStores() {
  return bootstrap ??= (async () => {
    const stored = await records()
    for (const key of syncedKeys) {
      let record = stored[key]
      const local = localStorage.getItem(key)
      if (key === 'waddle:records:v1' && local !== null && localStorage.getItem(dirtyKey(key))) {
        const unsaved = JSON.parse(local)
        if (!Array.isArray(unsaved)) throw new Error('Registros locais inválidos.')
        // Preserve the exact disconnected snapshot before reconciling it.
        localStorage.setItem('wendler:records-recovery:' + Date.now(), local)
        for (let attempt = 0; attempt < 5; attempt++) {
          const latest = (await records(key))[key]
          const value = recoverRecords(latest?.value as Parameters<typeof recoverRecords>[0] || [], unsaved)
          const committed = await write(key, value, latest?.revision || 0)
          if (!committed) continue
          record = committed
          localStorage.removeItem(dirtyKey(key))
          break
        }
        if (localStorage.getItem(dirtyKey(key))) throw new Error('Não foi possível recuperar os registros. Sua cópia foi preservada.')
      }
      if (!record && local !== null) { record = await write(key, JSON.parse(local), 0) ?? (await records(key))[key] }
      if (record) {
        revisions.set(key, record.revision)
        if (!localStorage.getItem(dirtyKey(key))) cache(key, record.value)
      }
    }
    initialized = true
  })().catch(error => { bootstrap = undefined; throw error })
}
export async function syncMutation<T>(key: string, apply: (previous: T) => T, fallback: () => T): Promise<T> {
  active.set(key, (active.get(key) || 0) + 1)
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const record = (await records(key))[key]
      const value = apply(record?.value !== null && record?.value !== undefined ? record.value as T : fallback())
      const saved = await write(key, value, record?.revision || 0)
      if (!saved) continue
      revisions.set(key, saved.revision)
      cache(key, saved.value)
      localStorage.removeItem(dirtyKey(key))
      window.dispatchEvent(new Event(`wendler:store:${key}`))
      return saved.value as T
    }
    throw new Error('O histórico mudou em outro dispositivo. Tente novamente.')
  } finally { active.set(key, Math.max(0, (active.get(key) || 1) - 1)) }
}
export function keepUnsaved(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem(dirtyKey(key), 'true') }
export async function refreshStores() {
  if (!initialized) return
  const stored = await records()
  for (const key of syncedKeys) {
    const record = stored[key]
    // A refresh started before a mutation may return after its newer commit.
    if (!record || active.get(key) || localStorage.getItem(dirtyKey(key)) || record.revision <= (revisions.get(key) ?? -1)) continue
    revisions.set(key, record.revision); cache(key, record.value); window.dispatchEvent(new Event(`wendler:store:${key}`))
  }
}
