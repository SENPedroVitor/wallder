import assert from 'node:assert/strict'
import { test } from 'node:test'
import { backupKeys, backupCounts, captureBackup, validateBackup, restoreBackup, recoveryKey } from '../src/backup.ts'

const agents = ['west', 'indy']
const fixture = () => ({ format: 'wendler-backup', version: 1, created: '2026-09-29T12:00:00.000Z', stores: {
  'wendler:frontend:v1': { profile: { name: 'Nome', nickname: 'Apelido', avatar: '' }, theme: 'dark', onboarded: true, prefs: { west: { accessory: true, tone: 'Claro', humor: 'Sutil' } }, sidebarAgents: agents, selected: 'team:one', chats: [
    { id: 'individual:west', title: 'Ash', agent: 'west', updated: 100, messages: [{ id: 'message:one', sender: 'you', text: 'Referência', at: 100, attachment: { name: 'nota.txt', size: 3, data: 'data:text/plain;base64,YWJj' } }] },
    { id: 'team:one', title: 'Projeto', agent: 'west', members: agents, archived: true, updated: 200, messages: [{ id: 'message:two', sender: 'indy', text: 'Pesquisa', at: 200, taskId: 'task:one', kind: 'handoff', transfer: { from: 'Ash', to: ['Indiana'], entries: [{ speaker: 'Você', text: 'Contexto' }] } }] },
  ] },
  'wendler:tasks:v1': [{ id: 'task:one', chatId: 'team:one', agent: 'indy', title: 'Pesquisa', instruction: 'Organizar contexto', status: 'done', created: 100, updated: 200, history: [{ status: 'done', at: 200 }], context: [{ speaker: 'Você', text: 'Contexto' }], result: 'Rascunho' }],
  'wendler:routines:v1': [{ id: 'routine:one', chatId: 'team:one', name: 'Revisão', instruction: 'Revisar', frequency: 'Dias úteis', time: '09:30', active: true, runs: [100] }],
  'wendler:plugins:v1': ['figma', 'drive'],
  'wendler-workspace-tabs-v1': { version: 1, activeId: 'tab:one', tabs: [{ id: 'tab:one', view: 'team', chatId: 'team:one' }] },
  'wendler:sidebar-collapsed': true,
  'wendler:context-links:v1': { 'team:one': { indy: true } },
  'wendler:linked-mini-chats:v2': { 'team:one': { indy: { draft: 'Continuar', messages: [{ sender: 'you', text: 'Contexto' }, { sender: 'agent', text: 'Resposta local' }] } } },
} })
function memoryStorage(initial = {}) { const values = new Map(Object.entries(initial)); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) } }
function invalid(name, mutate) { test(`rejects ${name}`, () => { const backup = fixture(); mutate(backup); assert.throws(() => validateBackup(backup, agents), /incompatível|inválid/); }) }

test('capture and restore roundtrip preserves every store and saves recovery snapshot', async () => {
  const backup = fixture()
  assert.deepEqual(Object.keys(backup.stores).sort(), [...backupKeys].sort())
  globalThis.localStorage = memoryStorage(Object.fromEntries(Object.entries(backup.stores).map(([key, value]) => [key, JSON.stringify(value)])))
  const captured = captureBackup()
  assert.deepEqual(validateBackup(captured, agents).stores, backup.stores)
  let reloads = 0
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  globalThis.window = { location: { reload: () => reloads++ } }
  const previous = fixture(); previous.stores['wendler:frontend:v1'].profile.name = 'Anterior'
  globalThis.localStorage = memoryStorage(Object.fromEntries(Object.entries(previous.stores).map(([key, value]) => [key, JSON.stringify(value)])))
  await restoreBackup(captured)
  assert.deepEqual(captureBackup().stores, backup.stores)
  assert.deepEqual(JSON.parse(localStorage.getItem(recoveryKey)).stores, previous.stores)
  assert.equal(reloads, 1)
})
test('counts includes archived teams, messages and tasks', () => { assert.deepEqual(backupCounts(fixture()), { chats: 2, messages: 2, teams: 1, tasks: 1 }) })
test('missing optional stores remain absent after restore', async () => {
  const backup = fixture(); for (const key of backupKeys.slice(1)) delete backup.stores[key]
  validateBackup(backup, agents)
  await restoreBackup(backup)
  for (const key of backupKeys.slice(1)) assert.equal(localStorage.getItem(key), null)
  assert.equal(backupCounts(backup).tasks, 0)
})
test('failed storage write restores all previous stores and does not reload', async () => {
  const previous = fixture(); previous.stores['wendler:frontend:v1'].profile.name = 'Antes da importação'
  const storage = memoryStorage(Object.fromEntries(Object.entries(previous.stores).map(([key, value]) => [key, JSON.stringify(value)])))
  let failOnce = true; let reloads = 0; let locks = 0
  globalThis.localStorage = { ...storage, setItem(key, value) { if (key === 'wendler:tasks:v1' && failOnce) { failOnce = false; throw new Error('QuotaExceededError') } storage.setItem(key, value) } }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (name, commit) => { assert.equal(name, 'wendler:data'); locks++; return commit() } } } })
  globalThis.window = { location: { reload: () => reloads++ } }
  await assert.rejects(restoreBackup(fixture()), /QuotaExceededError/)
  assert.deepEqual(captureBackup().stores, previous.stores)
  assert.deepEqual(JSON.parse(localStorage.getItem(recoveryKey)).stores, previous.stores)
  assert.equal(reloads, 0); assert.equal(locks, 1)
})
invalid('wrong format', b => { b.format = 'other' })
invalid('unsupported version', b => { b.version = 2 })
invalid('unknown store', b => { b.stores['other:store'] = {} })
invalid('invalid creation timestamp', b => { b.created = 'invalid' })
invalid('profile avatar URL', b => { b.stores['wendler:frontend:v1'].profile.avatar = 'https://example.com/a.png' })
invalid('profile name with incompatible type', b => { b.stores['wendler:frontend:v1'].profile.name = 42 })
invalid('unknown context link agent', b => { b.stores['wendler:context-links:v1']['team:one'].unknown = true })
invalid('nonboolean context link', b => { b.stores['wendler:context-links:v1']['team:one'].indy = 'yes' })
invalid('invalid message sender', b => { b.stores['wendler:frontend:v1'].chats[0].messages[0].sender = 'unknown' })
invalid('invalid message timestamp', b => { b.stores['wendler:frontend:v1'].chats[0].messages[0].at = 'yesterday' })
invalid('impossible message timestamp', b => { b.stores['wendler:frontend:v1'].chats[0].messages[0].at = 1e20 })
invalid('unknown member', b => { b.stores['wendler:frontend:v1'].chats[1].members = ['west', 'unknown'] })
invalid('duplicate participants', b => { b.stores['wendler:frontend:v1'].chats[1].members = ['west', 'west'] })
invalid('task agent', b => { b.stores['wendler:tasks:v1'][0].agent = 'unknown' })
invalid('task status', b => { b.stores['wendler:tasks:v1'][0].status = 'invented' })
invalid('task history timestamp', b => { b.stores['wendler:tasks:v1'][0].history[0].at = null })
invalid('duplicate conversation IDs', b => { b.stores['wendler:frontend:v1'].chats.push(structuredClone(b.stores['wendler:frontend:v1'].chats[0])) })
invalid('duplicate message IDs', b => { const c = b.stores['wendler:frontend:v1'].chats[0]; c.messages.push(structuredClone(c.messages[0])) })
invalid('duplicate task IDs', b => { b.stores['wendler:tasks:v1'].push(structuredClone(b.stores['wendler:tasks:v1'][0])) })
invalid('duplicate routine IDs', b => { b.stores['wendler:routines:v1'].push(structuredClone(b.stores['wendler:routines:v1'][0])) })
invalid('duplicate workspace tab IDs', b => { b.stores['wendler-workspace-tabs-v1'].tabs.push(structuredClone(b.stores['wendler-workspace-tabs-v1'].tabs[0])) })
