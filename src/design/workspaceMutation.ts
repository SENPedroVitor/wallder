import type { Chat, Workspace } from './workspace'

const privateChat = (chat: Chat) => (chat as Chat & { private?: boolean }).private === true
export function prepareWorkspaceMutation(before: Workspace, apply: (workspace: Workspace) => Workspace, privateIds: ReadonlySet<string>) {
  const next = apply(before)
  const ids = new Set(privateIds)
  const persistentIds = new Set(before.chats.filter(chat => !ids.has(chat.id) && !privateChat(chat)).map(chat => chat.id))
  const settings = next.settings as { privacy?: { saveHistory?: boolean } } | undefined
  for (const chat of next.chats) if (privateChat(chat) || (settings?.privacy?.saveHistory === false && !persistentIds.has(chat.id))) ids.add(chat.id)
  const memory = next.chats.filter(chat => ids.has(chat.id))
  // Capture the memory snapshot at dispatch, never a render closure or future state.
  const priorMemory = before.chats.filter(chat => privateIds.has(chat.id) || privateChat(chat))
  const persist = (previous: Workspace): Workspace => {
    const combined = { ...previous, chats: [...priorMemory, ...previous.chats.filter(chat => !privateIds.has(chat.id) && !privateChat(chat))], selected: before.selected }
    const changed = apply(combined)
    return { ...changed, chats: changed.chats.filter(chat => !ids.has(chat.id) && !privateChat(chat)), selected: previous.selected }
  }
  return { next, memory, privateIds: ids, persist }
}
