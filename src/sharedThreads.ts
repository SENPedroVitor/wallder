import type { MascotAgent } from './components/Mascot'

export type MiniThread = { draft: string; messages: { text: string; sender: 'you' | 'agent'; provider?: 'codex' }[] }
export type LinkedThreads = Record<string, Partial<Record<MascotAgent, MiniThread>>>
export const linkedStorageKey = 'wendler:linked-mini-chats:v2'
export const emptyMiniThread: MiniThread = { draft: '', messages: [] }

export function migrateLinkedThreads(threads: LinkedThreads, mapping: Record<string, string>): LinkedThreads {
  const result: LinkedThreads = {}
  for (const [oldId, cast] of Object.entries(threads)) {
    const target = mapping[oldId] ?? oldId
    const merged = result[target] ??= {}
    for (const [agent, thread] of Object.entries(cast)) {
      if (!thread) continue
      const previous = merged[agent as MascotAgent]
      merged[agent as MascotAgent] = previous
        ? { draft: thread.draft || previous.draft, messages: [...previous.messages, ...thread.messages] }
        : thread
    }
  }
  return result
}

function validThread(value: unknown): value is MiniThread {
  if (!value || typeof value !== 'object') return false
  const thread = value as Record<string, unknown>
  return typeof thread.draft === 'string' && Array.isArray(thread.messages) && thread.messages.every((value: unknown) => {
    if (!value || typeof value !== 'object') return false
    const message = value as Record<string, unknown>
    return typeof message.text === 'string' && (message.sender === 'you' || message.sender === 'agent')
  })
}

// A mini thread belongs to a particular primary conversation, not just an agent.
export function loadLinkedThreads(): LinkedThreads {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(linkedStorageKey) || '{}')
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}
    const result: LinkedThreads = {}
    for (const [conversationId, cast] of Object.entries(saved)) {
      if (!cast || typeof cast !== 'object' || Array.isArray(cast)) continue
      const valid = Object.entries(cast).filter(([, thread]) => validThread(thread))
      result[conversationId] = Object.fromEntries(valid)
    }
    return result
  } catch { return {} }
}
