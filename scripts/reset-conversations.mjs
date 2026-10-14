import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

// Explicit maintenance action; preserves the user profile and personalities.
const origin = 'http://127.0.0.1:5174'
const response = await fetch(origin + '/api/storage')
if (!response.ok) throw new Error('Não foi possível ler o histórico. Nada foi alterado.')
const { records } = await response.json()
const frontKey = 'wendler:frontend:v1'
const front = records[frontKey]?.value
if (!front || !Array.isArray(front.chats)) throw new Error('Histórico inválido. Nada foi alterado.')
const stamp = new Date().toISOString()
const directory = new URL('../.wendler/backups/', import.meta.url)
await mkdir(directory, { recursive: true })
const file = new URL(`conversas-antes-reset-${stamp.replace(/[:.]/g, '-')}.json`, directory)
await writeFile(file, JSON.stringify({ format: 'wendler-backup', version: 1, created: stamp, stores: Object.fromEntries(Object.entries(records).map(([key, record]) => [key, record.value])) }, null, 2), { mode: 0o600 })
const values = {
  'wendler:linked-mini-chats:v2': {},
  'wendler:tasks:v1': [],
  'wendler:context-links:v1': {},
  [frontKey]: { ...front, chats: front.chats.map(chat => ({ ...chat, messages: [], updated: 0 })), sidebarAgents: ['west'], selected: front.chats.find(chat => !chat.members && chat.agent === 'west')?.id ?? null, contextEpoch: randomUUID(), contextResetAt: Date.now() },
}
for (const [key, value] of Object.entries(values)) {
  const saved = await fetch(origin + '/api/storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value, revision: records[key]?.revision ?? 0 }) })
  if (!saved.ok) throw new Error(`O histórico mudou durante a limpeza (${key}). Cópia preservada em ${fileURLToPath(file)}.`)
}
console.log(JSON.stringify({ backup: fileURLToPath(file), clearedMessages: front.chats.reduce((count, chat) => count + chat.messages.length, 0), chats: front.chats.length, personalitiesPreserved: true }))
