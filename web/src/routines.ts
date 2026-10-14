export type Routine = { id: string; chatId: string; name: string; instruction: string; frequency: string; time: string; active: boolean; runs: number[] }
export const routineStorageKey = 'wendler:routines:v1'
export function parseSchedule(text: string): { frequency: string; time: string } | null {
  const frequency = /dias úteis/i.test(text) ? 'Dias úteis' : /(?:toda|todas as) segunda/i.test(text) ? 'Toda segunda-feira' : /(?:todos os dias|todo dia|diariamente)/i.test(text) ? 'Todos os dias' : null
  const match = text.match(/(?:às|as|a[s]?\s+)\s*(\d{1,2})(?::(\d{2})|h(\d{2})?)?(?:\s|[.,!?]|$)/i)
  if (!frequency || !match) return null
  const hour = Number(match[1]); const minute = Number(match[2] || match[3] || 0)
  return hour < 24 && minute < 60 ? { frequency, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` } : null
}
export function loadRoutines(): Routine[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(routineStorageKey) || '[]'); return Array.isArray(value) ? value.filter((r): r is Routine => r && typeof r.id === 'string' && typeof r.chatId === 'string' && typeof r.name === 'string' && typeof r.instruction === 'string' && ['Todos os dias', 'Dias úteis', 'Toda segunda-feira'].includes(r.frequency) && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) && typeof r.active === 'boolean' && Array.isArray(r.runs)).map(r => ({ ...r, runs: r.runs.filter(Number.isFinite) })) : [] } catch { return [] }
}
export function createRoutineFromMessage(text: string, chatId: string): Routine | null {
  const schedule = parseSchedule(text)
  if (!schedule) return null
  const routine: Routine = { id: crypto.randomUUID(), chatId, name: text.length > 50 ? `${text.slice(0, 47)}…` : text, instruction: text, ...schedule, active: true, runs: [] }
  const commit = () => {
    localStorage.setItem(routineStorageKey, JSON.stringify([routine, ...loadRoutines()]))
    window.dispatchEvent(new Event(`wendler:store:${routineStorageKey}`))
    window.dispatchEvent(new Event('wendler:routines-changed'))
  }
  if (globalThis.navigator?.locks) void navigator.locks.request('wendler:data', commit).catch(() => window.dispatchEvent(new Event('wendler:save-error')))
  else commit()
  return routine
}
