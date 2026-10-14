export const backupKeys = ['wendler:frontend:v1', 'wendler:linked-mini-chats:v2', 'wendler:tasks:v1', 'wendler:routines:v1', 'wendler:plugins:v1', 'wendler-workspace-tabs-v1', 'wendler:sidebar-collapsed', 'wendler:context-links:v1', 'waddle:records:v1'] as const
export const recoveryKey = 'wendler:backup-recovery:v1'
export type Backup = { format: 'wendler-backup'; version: 1; created: string; stores: Record<string, unknown> }
type Obj = Record<string, unknown>
const object = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const string = (v: unknown): v is string => typeof v === 'string'
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(string)
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 8.64e15
const context = (v: unknown) => Array.isArray(v) && v.every(e => object(e) && string(e.speaker) && string(e.text))
const image = (v: unknown) => string(v) && (v === '' || /^data:image\/[a-z.+-]+;base64,/i.test(v))
const status = (v: unknown) => ['thinking', 'running', 'waiting', 'blocked', 'done'].includes(String(v))
export function validateBackup(value: unknown, agents: string[]): Backup {
  const fail = () => { throw new Error('Arquivo incompatível ou dados inválidos. Nenhuma alteração foi feita.') }
  if (!object(value) || value.format !== 'wendler-backup' || value.version !== 1 || !string(value.created) || !Number.isFinite(Date.parse(value.created)) || !object(value.stores)) return fail()
  const stores = value.stores
  if (Object.keys(stores).some(key => !backupKeys.includes(key as typeof backupKeys[number]))) return fail()
  const agent = (v: unknown) => string(v) && agents.includes(v)
  const message = (v: unknown): boolean => object(v) && string(v.id) && (v.sender === 'you' || agent(v.sender)) && string(v.text) && finite(v.at) &&
    (v.kind === undefined || ['context', 'routine', 'handoff'].includes(String(v.kind))) &&
    (v.taskId === undefined || string(v.taskId)) &&
    (v.attachment === undefined || (object(v.attachment) && string(v.attachment.name) && finite(v.attachment.size) && Number(v.attachment.size) >= 0 && string(v.attachment.data) && /^data:[^,]*;base64,/.test(v.attachment.data))) &&
    (v.transfer === undefined || (object(v.transfer) && string(v.transfer.from) && strings(v.transfer.to) && context(v.transfer.entries)))
  const front = stores[backupKeys[0]]
  if (!object(front) || !object(front.profile) || !string(front.profile.name) || !string(front.profile.nickname) || !image(front.profile.avatar) || !['light', 'dark'].includes(String(front.theme)) || typeof front.onboarded !== 'boolean' || !object(front.prefs) || !strings(front.sidebarAgents) || !front.sidebarAgents.every(agent) || !(front.selected === null || string(front.selected)) || !Array.isArray(front.chats)) return fail()
  if (!Object.entries(front.prefs).every(([id, pref]) => agent(id) && object(pref) && typeof pref.accessory === 'boolean' && string(pref.tone) && string(pref.humor))) return fail()
  if (!front.chats.every(c => object(c) && string(c.id) && string(c.title) && agent(c.agent) && finite(c.updated) && (c.archived === undefined || typeof c.archived === 'boolean') && (c.members === undefined || (strings(c.members) && c.members.length >= 2 && c.members.every(agent))) && Array.isArray(c.messages) && c.messages.every(message) && new Set(c.messages.map(m => (m as Obj).id)).size === c.messages.length)) return fail()
  if (new Set(front.chats.map(c => (c as Obj).id)).size !== front.chats.length) return fail()
  for (const key of backupKeys.slice(1)) {
    const v = stores[key]; if (v === undefined || v === null) continue
    if (key === 'waddle:records:v1' && !(Array.isArray(v) && v.every(r => object(r) && string(r.id) && string(r.kind) && string(r.title) && object(r.fields) && Object.values(r.fields).every(string) && finite(r.updated)))) return fail()
    if (key === 'wendler:tasks:v1' && !(Array.isArray(v) && v.every(t => object(t) && string(t.id) && string(t.chatId) && agent(t.agent) && string(t.title) && string(t.instruction) && status(t.status) && finite(t.created) && finite(t.updated) && context(t.context) && Array.isArray(t.history) && t.history.every(h => object(h) && status(h.status) && finite(h.at)) && (t.result === undefined || string(t.result))))) return fail()
    if (key === 'wendler:routines:v1' && !(Array.isArray(v) && v.every(r => object(r) && string(r.id) && string(r.chatId) && string(r.name) && string(r.instruction) && ['Todos os dias', 'Dias úteis', 'Toda segunda-feira'].includes(String(r.frequency)) && string(r.time) && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) && typeof r.active === 'boolean' && Array.isArray(r.runs) && r.runs.every(finite)))) return fail()
    if (key === 'wendler:plugins:v1' && !strings(v)) return fail()
    if (key === 'wendler:sidebar-collapsed' && typeof v !== 'boolean') return fail()
    if (key === 'wendler:linked-mini-chats:v2' && !(object(v) && Object.values(v).every(c => object(c) && Object.entries(c).every(([id, t]) => agent(id) && object(t) && string(t.draft) && Array.isArray(t.messages) && t.messages.every(m => object(m) && ['you', 'agent'].includes(String(m.sender)) && string(m.text)))))) return fail()
    if (key === 'wendler:context-links:v1' && !(object(v) && Object.values(v).every(c => object(c) && Object.entries(c).every(([id, enabled]) => agent(id) && typeof enabled === 'boolean')))) return fail()
    if (key === 'wendler-workspace-tabs-v1' && !(object(v) && v.version === 1 && string(v.activeId) && Array.isArray(v.tabs) && v.tabs.length > 0 && v.tabs.length <= 50 && v.tabs.every(t => object(t) && string(t.id) && ['chat', 'team', 'expressions', 'settings'].includes(String(t.view))) && v.tabs.some(t => (t as Obj).id === v.activeId))) return fail()
  }
  if (front.chats.some(c => { const members = (c as Obj).members; return Array.isArray(members) && new Set(members).size !== members.length })) return fail()
  for (const key of ['wendler:tasks:v1', 'wendler:routines:v1']) {
    const entries = stores[key]; if (Array.isArray(entries) && new Set(entries.map(entry => (entry as Obj).id)).size !== entries.length) return fail()
  }
  const tabs = stores['wendler-workspace-tabs-v1']; if (object(tabs) && Array.isArray(tabs.tabs) && new Set(tabs.tabs.map(t => (t as Obj).id)).size !== tabs.tabs.length) return fail()
  return value as Backup
}
export function captureBackup(): Backup {
  const stores: Record<string, unknown> = {}
  for (const key of backupKeys) { const raw = localStorage.getItem(key); stores[key] = raw === null ? null : JSON.parse(raw) }
  return { format: 'wendler-backup', version: 1, created: new Date().toISOString(), stores }
}
export function backupCounts(backup: Backup) {
  const front = backup.stores['wendler:frontend:v1'] as { chats: { members?: string[]; messages: unknown[] }[] }
  return { chats: front.chats.length, messages: front.chats.reduce((sum, c) => sum + c.messages.length, 0), teams: front.chats.filter(c => c.members).length, tasks: (backup.stores['wendler:tasks:v1'] as unknown[] | null)?.length ?? 0 }
}
export function downloadBackup(backup: Backup, prefix = 'wendler') {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `${prefix}-${backup.created.slice(0,19).replace(/:/g,'-')}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function restoreBackup(backup: Backup) {
  const commit = () => {
    const before = captureBackup()
    localStorage.setItem(recoveryKey, JSON.stringify(before))
    try {
      for (const key of backupKeys) { const value = backup.stores[key]; if (value === null || value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)) }
    } catch (error) {
      // Free partially imported values first, so rollback also works near quota.
      for (const key of backupKeys) localStorage.removeItem(key)
      for (const key of backupKeys) { const value = before.stores[key]; if (value !== null) localStorage.setItem(key, JSON.stringify(value)) }
      throw error
    }
  }
  if (navigator.locks) await navigator.locks.request('wendler:data', commit); else commit()
  await saveRestoredStores(backup.stores)
  window.location.reload()
}
import { saveRestoredStores } from './syncedStore.ts'
