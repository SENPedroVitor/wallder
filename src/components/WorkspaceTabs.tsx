import { useEffect, useRef, useState } from 'react'
import { MessageCircle, MoreHorizontal, Plus, Settings2, Sparkles, Users, X } from 'lucide-react'
import './workspace-tabs.css'

export type WorkspaceView = 'chat' | 'team' | 'expressions' | 'settings'

type Tab = { id: string; view: WorkspaceView }
type TabsState = { tabs: Tab[]; activeId: string }
type Menu = { tabId: string; x: number; y: number }

const STORAGE_KEY = 'wendler-workspace-tabs-v1'
const views = {
  chat: { label: 'Conversas', icon: MessageCircle },
  team: { label: 'Equipe', icon: Users },
  expressions: { label: 'Expressões', icon: Sparkles },
  settings: { label: 'Ajustes', icon: Settings2 },
} as const

function isView(value: unknown): value is WorkspaceView {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(views, value)
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function initialState(view: WorkspaceView, forceInitialView = false): TabsState {
  const fallback = { tabs: [{ id: newId(), view }], activeId: '' }
  fallback.activeId = fallback.tabs[0].id
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    const saved = parsed as { version?: unknown; tabs?: unknown; activeId?: unknown }
    if (saved.version !== 1 || !Array.isArray(saved.tabs) || saved.tabs.length < 1 || saved.tabs.length > 50) return fallback
    const tabs = saved.tabs as unknown[]
    if (!tabs.every(tab => tab && typeof tab === 'object' && typeof (tab as Tab).id === 'string' && (tab as Tab).id.length > 0 && isView((tab as Tab).view))) return fallback
    const validTabs = tabs as Tab[]
    if (new Set(validTabs.map(tab => tab.id)).size !== validTabs.length || !validTabs.some(tab => tab.id === saved.activeId)) return fallback
    return { tabs: forceInitialView ? validTabs.map(tab => tab.id === saved.activeId ? { ...tab, view } : tab) : validTabs, activeId: saved.activeId as string }
  } catch {
    return fallback
  }
}

function moveTab(tabs: Tab[], from: number, to: number) {
  if (from < 0 || to < 0 || from === to) return tabs
  const result = [...tabs]
  result.splice(to, 0, result.splice(from, 1)[0])
  return result
}

export default function WorkspaceTabs({ view, onViewChange, forceInitialView = false }: {
  view: WorkspaceView
  forceInitialView?: boolean
  onViewChange: (view: WorkspaceView) => void
}) {
  const [state, setState] = useState<TabsState>(() => initialState(view, forceInitialView))
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const previousView = useRef(view)
  const onViewChangeRef = useRef(onViewChange)
  onViewChangeRef.current = onViewChange
  const activeTab = state.tabs.find(tab => tab.id === state.activeId) ?? state.tabs[0]

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    if (activeTab.view !== view) onViewChangeRef.current(activeTab.view)
  }, [])

  useEffect(() => {
    if (previousView.current === view) return
    previousView.current = view
    setState(current => {
      const active = current.tabs.find(tab => tab.id === current.activeId)
      if (!active || active.view === view) return current
      return { ...current, tabs: current.tabs.map(tab => tab.id === current.activeId ? { ...tab, view } : tab) }
    })
  }, [view]) // Only a parent navigation change updates the current tab.

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state })) } catch { /* Private mode or disabled storage. */ }
  }, [state])

  useEffect(() => {
    if (!menu) return
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenu(null); focusTab(menu.tabId) }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [menu])

  function focusTab(id: string) {
    root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach(button => {
      if (button.dataset.tabId === id) button.focus()
    })
  }

  function activate(id: string) {
    const tab = state.tabs.find(item => item.id === id)
    if (!tab) return
    setState(current => ({ ...current, activeId: id }))
    setMenu(null)
    if (tab.view !== view) onViewChange(tab.view)
  }

  function addTab() {
    if (state.tabs.length >= 50) return
    const id = newId()
    setState(current => ({ tabs: [...current.tabs, { id, view: 'chat' }], activeId: id }))
    setMenu(null)
    if (view !== 'chat') onViewChange('chat')
    requestAnimationFrame(() => focusTab(id))
  }

  function keepTabs(tabs: Tab[], focusId: string) {
    if (!tabs.length) return
    const nextActive = tabs.some(tab => tab.id === state.activeId) ? state.activeId : focusId
    const next = tabs.find(tab => tab.id === nextActive) ?? tabs[0]
    setState({ tabs, activeId: next.id })
    setMenu(null)
    if (next.view !== view) onViewChange(next.view)
    requestAnimationFrame(() => focusTab(next.id))
  }

  function closeTab(id: string) {
    if (state.tabs.length === 1) return
    const index = state.tabs.findIndex(tab => tab.id === id)
    const tabs = state.tabs.filter(tab => tab.id !== id)
    keepTabs(tabs, tabs[Math.min(index, tabs.length - 1)].id)
  }

  function openMenu(tabId: string, x: number, y: number) {
    const width = 188
    const height = 172
    setMenu({ tabId, x: Math.max(8, Math.min(x, window.innerWidth - width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - height - 8)) })
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus())
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = Math.min(state.tabs.length - 1, index + 1)
    else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = state.tabs.length - 1
    else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); closeTab(state.tabs[index].id); return }
    else return
    event.preventDefault()
    if (event.ctrlKey && event.shiftKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      setState(current => ({ ...current, tabs: moveTab(current.tabs, index, next) }))
      requestAnimationFrame(() => focusTab(state.tabs[index].id))
    } else {
      activate(state.tabs[next].id)
      focusTab(state.tabs[next].id)
    }
  }

  return <div className="workspace-tabs" ref={root} aria-label="Abas do espaço de trabalho">
    <div className="workspace-tabs__scroll" role="tablist" aria-label="Páginas abertas">
      {state.tabs.map((tab, index) => {
        const Icon = views[tab.view].icon
        const active = tab.id === state.activeId
        return <div key={tab.id} className={`workspace-tabs__item${active ? ' is-active' : ''}${dragging === tab.id ? ' is-dragging' : ''}`}
          draggable onDragStart={event => { setDragging(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id) }}
          onDragEnd={() => setDragging(null)} onDragOver={event => { if (dragging) event.preventDefault() }}
          onDrop={event => { event.preventDefault(); const source = event.dataTransfer.getData('text/plain'); const from = state.tabs.findIndex(item => item.id === source); setState(current => ({ ...current, tabs: moveTab(current.tabs, from, index) })); setDragging(null) }}
          onContextMenu={event => { event.preventDefault(); openMenu(tab.id, event.clientX, event.clientY) }}>
          <button type="button" className="workspace-tabs__tab" role="tab" data-tab-id={tab.id} id={`workspace-tab-${tab.id}`}
            aria-selected={active} aria-controls="workspace-tab-panel" tabIndex={active ? 0 : -1}
            onClick={() => activate(tab.id)} onAuxClick={event => { if (event.button === 1) closeTab(tab.id) }}
            onKeyDown={event => onTabKeyDown(event, index)} title={views[tab.view].label}>
            <Icon size={15} strokeWidth={1.8} aria-hidden="true" /><span>{views[tab.view].label}</span>
          </button>
          <button type="button" className="workspace-tabs__more" aria-label={`Opções da aba ${views[tab.view].label}`} aria-haspopup="menu" aria-expanded={menu?.tabId === tab.id}
            onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); openMenu(tab.id, rect.left, rect.bottom + 6) }}><MoreHorizontal size={15} aria-hidden="true" /></button>
          {state.tabs.length > 1 && <button type="button" className="workspace-tabs__close" aria-label={`Fechar aba ${views[tab.view].label}`} onClick={() => closeTab(tab.id)}><X size={14} aria-hidden="true" /></button>}
        </div>
      })}
      <button type="button" className="workspace-tabs__add" onClick={addTab} disabled={state.tabs.length >= 50} aria-label="Nova aba" title="Nova aba"><Plus size={17} aria-hidden="true" /></button>
    </div>
    {menu && <div className="workspace-tabs__menu" ref={menuRef} role="menu" aria-label="Opções da aba" style={{ left: menu.x, top: menu.y }}>
      <button role="menuitem" disabled={state.tabs.length === 1} onClick={() => closeTab(menu.tabId)}>Fechar aba</button>
      <button role="menuitem" disabled={state.tabs.length === 1} onClick={() => keepTabs(state.tabs.filter(tab => tab.id === menu.tabId), menu.tabId)}>Fechar outras abas</button>
      <button role="menuitem" disabled={state.tabs.findIndex(tab => tab.id === menu.tabId) === state.tabs.length - 1} onClick={() => keepTabs(state.tabs.slice(0, state.tabs.findIndex(tab => tab.id === menu.tabId) + 1), menu.tabId)}>Fechar abas à direita</button>
      <button role="menuitem" disabled={state.tabs.findIndex(tab => tab.id === menu.tabId) === 0} onClick={() => keepTabs(state.tabs.slice(state.tabs.findIndex(tab => tab.id === menu.tabId)), menu.tabId)}>Fechar abas à esquerda</button>
    </div>}
  </div>
}
