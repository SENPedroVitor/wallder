import { useCallback, useRef, useState, type SetStateAction } from 'react'
import { useLocalStore } from '../useLocalStore'
import { frontendKey, loadWorkspace, type Chat, type Workspace } from './workspace'
import { prepareWorkspaceMutation } from './workspaceMutation'
import { conversationFromLink } from './conversationLink'

const selectionKey = 'wendler:selected-chat:v1'

export function useWorkspace() {
  const [stored, save, error] = useLocalStore(frontendKey, loadWorkspace)
  const [selection, setSelection] = useState<string | null>(() => {
    const linked = conversationFromLink(stored.chats, window.location.search)
    if (linked) return linked
    try { const saved = localStorage.getItem(selectionKey); return saved === null ? stored.selected : saved || null } catch { return stored.selected }
  })
  const [privateChats, setPrivateChats] = useState<Chat[]>([])
  const data: Workspace = { ...stored, chats: [...privateChats, ...stored.chats], selected: selection }
  const current = useRef<Workspace>(data)
  const privateIds = useRef(new Set<string>())
  current.current = data
  const update = useCallback((action: SetStateAction<Workspace>) => {
    const before = current.current
    const apply = (value: Workspace) => typeof action === 'function' ? action(value) : action
    const plan = prepareWorkspaceMutation(before, apply, privateIds.current)
    const next = plan.next
    privateIds.current = plan.privateIds
    current.current = next
    setSelection(next.selected)
    try { localStorage.setItem(selectionKey, next.selected || '') } catch {}
    setPrivateChats(plan.memory)
    save(plan.persist)
  }, [save])
  return [data, update, error] as const
}
