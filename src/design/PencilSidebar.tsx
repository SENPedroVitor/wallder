import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, ChevronsUpDown, Folder, History, Link, Plus, Search, Settings, Users } from 'lucide-react'
import { CanvasMascot } from './CanvasScene'
import type { Workspace, Chat } from './workspace'
import type { MascotAgent } from '../components/Mascot'

type Agent = { id: MascotAgent; name: string }
const groups = {
 space: { title: 'Seu espaço', items: ['Projetos', 'Rotinas', 'Meus registros', 'Meus favoritos', 'Memória dos agentes'] },
 connections: { title: 'Conexões', items: ['Conexões', 'Plugins'] },
 settings: { title: 'Configurações', items: ['Perfil', 'Conta', 'Aparência', 'Notificações', 'Privacidade', 'Permissões'] },
}
type MenuGroup = keyof typeof groups
export function PencilSidebar({ data, agents, current, busy, menu, onMenu, onAgent, onNew, onSearch, onNavigate }: {
 data: Workspace; agents: Agent[]; current: MascotAgent; busy: Record<string, boolean>; menu: boolean;
 onMenu: () => void; onAgent: (id: MascotAgent) => void; onNew: () => void; onSearch: () => void; onNavigate: (label: string) => void
}) {
 const [search, setSearch] = useState(''), [group, setGroup] = useState<MenuGroup | null>(null)
 const dismissMenu = useRef(onMenu); dismissMenu.current = onMenu
 const footer = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null)
 const latest = new Map<string, Chat>()
 for (const chat of data.chats) if (!chat.archived && (!latest.has(chat.agent) || latest.get(chat.agent)!.updated < chat.updated)) latest.set(chat.agent, chat)
 useEffect(() => {
  if (!menu) { setGroup(null); return }
  popup.current?.querySelector<HTMLButtonElement>('button')?.focus()
  const dismiss = (event: PointerEvent) => { if (!footer.current?.contains(event.target as Node)) dismissMenu.current() }
  document.addEventListener('pointerdown', dismiss)
  return () => document.removeEventListener('pointerdown', dismiss)
 }, [menu])
 const sidebarIds = [...new Set([...data.sidebarAgents, 'kendrick' as const])].filter(id => id !== 'west')
 const ash = agents.find(agent => agent.id === 'west')
 const changeGroup = (value: MenuGroup | null) => { setGroup(value); requestAnimationFrame(() => popup.current?.querySelector<HTMLButtonElement>('button')?.focus()) }
 return <aside className="pencil-sidebar" aria-label="Navegação">
  <header className="pencil-sidebar-heading"><button type="button" className={current === 'west' ? 'selected' : ''} aria-label={'Conversar com '+(ash?.name || 'Ash')} aria-current={current === 'west' ? 'page' : undefined} title={ash?.name || 'Ash'} onClick={() => onAgent('west')}><CanvasMascot agent="west" photo={data.prefs.west?.photo as string | undefined} color={data.prefs.west?.color as string | undefined} size={26}/></button><label className="pencil-sidebar-search"><Search size={15}/><input aria-label="Buscar agentes" placeholder="Buscar" value={search} onChange={event => setSearch(event.target.value)}/></label><button type="button" aria-label="Nova conversa" title="Nova conversa" onClick={onNew}><Plus size={18}/></button></header>
  <nav className="pencil-sidebar-agents" aria-label="Seus agentes">{sidebarIds.filter(id => !search || agents.find(a => a.id === id)?.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(id => {
   const agent = agents.find(a => a.id === id); if (!agent) return null
   const chat = latest.get(id)
   return <button type="button" key={id} aria-current={id === current ? 'page' : undefined} onClick={() => onAgent(id)} className={id === current ? 'selected' : ''}>
    <CanvasMascot agent={id} photo={data.prefs[id]?.photo as string | undefined} color={data.prefs[id]?.color as string | undefined} size={26}/>
    <span><strong>{agent.name}</strong>{chat?.messages.length ? <small>{chat.messages.at(-1)?.text.slice(0, 60)}</small> : null}</span>
    {chat && busy[chat.id] ? <span className="pencil-agent-busy" aria-label="Respondendo"/> : null}
   </button>
  })}{search && !sidebarIds.some(id => agents.find(a => a.id === id)?.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <p className="pencil-sidebar-no-results">Nenhum agente encontrado.</p>}</nav>
  <div className="pencil-sidebar-footer" ref={footer}>
   <button ref={trigger} type="button" className="pencil-sidebar-profile" aria-label="Menu da conta" aria-haspopup="menu" aria-expanded={menu} onClick={onMenu}>{data.profile.avatar ? <img src={data.profile.avatar} alt=""/> : <CanvasMascot agent="west" size={26}/>}<span>{data.profile.name || 'Visitante'}</span><ChevronsUpDown size={14}/></button>
   {menu && <div ref={popup} className="pencil-sidebar-menu" role="menu" aria-label={group ? groups[group].title : 'Menu da conta'} onKeyDown={event => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')], index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (group) changeGroup(null); else { onMenu(); trigger.current?.focus() } }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length]?.focus() }
   }}>
    {group ? <><button type="button" role="menuitem" onClick={() => changeGroup(null)}><ArrowLeft size={15}/>{groups[group].title}</button><div className="pencil-menu-divider" role="separator"/>{groups[group].items.map(label => <button type="button" key={label} role="menuitem" onClick={() => onNavigate(label)}>{label}</button>)}</> : <>
     <button type="button" role="menuitem" onClick={() => { onMenu(); onSearch() }}><Search size={16}/>Buscar no seu espaço</button>
     <button type="button" role="menuitem" onClick={() => onNavigate('Histórico e itens fixados')}><History size={16}/>Histórico e itens fixados</button>
     <button type="button" role="menuitem" onClick={() => onNavigate('Seus agentes')}><Users size={16}/>Seus agentes</button>
     <div className="pencil-menu-divider" role="separator"/>
     {([{ key: 'space', Icon: Folder }, { key: 'connections', Icon: Link }, { key: 'settings', Icon: Settings }] as const).map(({ key, Icon }) => <button type="button" key={key} role="menuitem" onClick={() => changeGroup(key)}><Icon size={16}/>{groups[key].title}<ChevronRight className="pencil-menu-chevron" size={14}/></button>)}
    </>}
   </div>}
  </div>
 </aside>
}
