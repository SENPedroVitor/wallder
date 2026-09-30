import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowRight, ArrowUp, Check, ChevronDown, ChevronRight, CircleHelp, Feather, ImagePlus, Menu, MessageCircle, Moon, MoreHorizontal, PanelLeft, Plug, Monitor, Paperclip, FileText, Search, Settings2, Sparkles, Sun, Trash2, Users, X } from 'lucide-react'
import Mascot, { mascotStates, type MascotState, type MascotAgent } from './components/Mascot'
import './sketch-studies.css'
import TeamQuickMenu from './components/TeamQuickMenu'
import MiniAgentChat from './components/MiniAgentChat'
import SharedContext from './components/SharedContext'
import WorkspaceTabs from './components/WorkspaceTabs'
import AgentPicker from './components/AgentPicker'
import './sidebar-layout.css'
import PluginsDialog from './components/PluginsDialog'
import WorkPanel from './components/WorkPanel'
import './conversation-layout.css'
import ChatMessages from './components/ChatMessages'
import MentionComposer from './components/MentionComposer'
import { loadTasks, mentionedAgents, transitionTask, taskLabels, taskStorageKey, taskTitle, type ChatTask, type ChatMessage, type TaskStatus } from './chatWork'
import { createRoutineFromMessage } from './routines'
import { useLocalStore } from './useLocalStore'
import BackupSettings from './components/BackupSettings'
import SearchConversation, { type ConversationSearchResult } from './components/SearchConversation'
import ProjectTeams from './components/project-teams'
import './components/local-features.css'
import { permanentChats, rememberContact } from './permanentChats'
import { loadLinkedThreads, migrateLinkedThreads, linkedStorageKey, emptyMiniThread } from './sharedThreads'

type AgentId = MascotAgent
type View = 'chat' | 'team' | 'expressions' | 'settings'
type Theme = 'light' | 'dark'
type Message = ChatMessage
type Conversation = { id: string; title: string; agent: AgentId; messages: Message[]; updated: number; members?: AgentId[]; archived?: boolean }
type Profile = { name: string; nickname: string; avatar: string }
type AgentPrefs = Record<AgentId, { accessory: boolean; tone: string; humor: string }>
type Stored = { profile: Profile; theme: Theme; prefs: AgentPrefs; chats: Conversation[]; sidebarAgents: AgentId[]; selected: string | null; onboarded: boolean }

const agents: { id: AgentId; name: string; role: string; tagline: string; color: string }[] = [
  { id: 'west', name: 'Ash', role: 'Direção criativa', tagline: 'Uma ideia ganha forma quando encontra a equipe certa.', color: '#b46b43' },
  { id: 'ted', name: 'Ted', role: 'Acervo pessoal', tagline: 'Organiza histórias, obras e tudo que vale lembrar.', color: '#68856f' },
  { id: 'indy', name: 'Indiana', role: 'Pesquisa', tagline: 'Vai atrás das pistas e volta com contexto.', color: '#a18551' },
  { id: 'livro', name: 'Livro', role: 'Esportes', tagline: 'Um olhar atento para o que acontece em campo.', color: '#6784a2' },
  { id: 'figma', name: 'Figma', role: 'Design', tagline: 'Ajuda a dar forma visual às ideias.', color: '#9c75a4' },
]
const additionalAgents: { id: AgentId; name: string; role: string; tagline: string; color: string }[] = [
  ['pam', 'Pam', 'Secretaria'], ['kyle', 'Kyle Rayner', 'Design criativo'],
  ['sheldon', 'Sheldon Cooper', 'Revisão'], ['dumbledore', 'Dumbledore', 'Mentoria'],
  ['songbird', 'Songbird', 'Programação'], ['rorschach', 'Rorschach', 'Escrita'],
  ['homer', 'Homer', 'Computador'], ['c3po', 'C-3PO', 'Análise'],
  ['batman', 'Batman', 'Planejamento'], ['reed', 'Reed Richards', 'Automação'],
  ['ultron', 'Ultron', 'Infraestrutura'], ['captain', 'Capitão América', 'Segurança'],
  ['marilia', 'Marília', 'Acompanhamento'], ['hal', 'Hal Jordan', 'Ideias'],
  ['tony', 'Tony Stark', 'Engenharia de agentes'],
].map(([id, name, role]) => ({ id: id as AgentId, name, role, tagline: 'Um espaço para organizar suas ideias e continuar de onde parou.', color: '#a18551' }))
agents.push(...additionalAgents)
const defaultPrefs: AgentPrefs = {
  ...Object.fromEntries(additionalAgents.map(agent => [agent.id, { accessory: true, tone: 'Claro', humor: 'Equilibrado' }])) as AgentPrefs,
  west: { accessory: true, tone: 'Criativo', humor: 'Equilibrado' },
  ted: { accessory: true, tone: 'Acolhedor', humor: 'Equilibrado' },
  indy: { accessory: true, tone: 'Curioso', humor: 'Sutil' },
  livro: { accessory: true, tone: 'Direto', humor: 'Equilibrado' },
  figma: { accessory: true, tone: 'Claro', humor: 'Sutil' },
}
const initial: Stored = { profile: { name: '', nickname: '', avatar: '' }, theme: 'light', prefs: defaultPrefs, chats: [], sidebarAgents: ['west'], selected: null, onboarded: false }
const sketchAgents: { id: MascotAgent; name: string }[] = [
  { id: 'west', name: 'Ash' },
  { id: 'indy', name: 'Indiana Jones' },
  { id: 'ted', name: 'Ted Mosby' },
  { id: 'pam', name: 'Pam' },
  { id: 'kyle', name: 'Kyle Rayner' },
  { id: 'sheldon', name: 'Sheldon Cooper' },
  { id: 'dumbledore', name: 'Dumbledore' },
  { id: 'songbird', name: 'Songbird' },
  { id: 'rorschach', name: 'Rorschach' },
  { id: 'homer', name: 'Homer' },
  { id: 'c3po', name: 'C-3PO' },
  { id: 'batman', name: 'Batman' },
  { id: 'reed', name: 'Reed Richards' },
  { id: 'ultron', name: 'Ultron' },
  { id: 'captain', name: 'Capitão América' },
  { id: 'marilia', name: 'Marília' },
  { id: 'hal', name: 'Hal Jordan' },
  { id: 'tony', name: 'Tony Stark' },
]
const key = 'wendler:frontend:v1'
const id = () => Math.random().toString(36).slice(2, 10)
const agentById = (agent: AgentId) => agents.find(item => item.id === agent) ?? agents[0]

let migratedChatIds: Record<string, string> = {}
function load(): Stored {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null') as Partial<Stored> | null
    if (!parsed) return { ...initial, chats: permanentChats<Conversation>([], agents).chats }
    const validAgents = new Set(agents.map(agent => agent.id))
    const loaded: Stored = {
      ...initial,
      onboarded: parsed.onboarded === true,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      selected: typeof parsed.selected === 'string' ? parsed.selected : null,
      sidebarAgents: [...new Set<AgentId>(['west', ...(Array.isArray(parsed.sidebarAgents) ? parsed.sidebarAgents.filter(agent => validAgents.has(agent)) : [])])],
      profile: { name: typeof parsed.profile?.name === 'string' ? parsed.profile.name : '', nickname: typeof parsed.profile?.nickname === 'string' ? parsed.profile.nickname : '', avatar: typeof parsed.profile?.avatar === 'string' ? parsed.profile.avatar : '' },
      prefs: Object.fromEntries(agents.map(agent => [agent.id, { ...defaultPrefs[agent.id], ...parsed.prefs?.[agent.id] }])) as AgentPrefs,
      chats: Array.isArray(parsed.chats) ? parsed.chats.filter(chat => chat && typeof chat.id === 'string' && typeof chat.title === 'string' && validAgents.has(chat.agent) && Array.isArray(chat.messages)).map(chat => ({ ...chat, members: (() => {
        const members = Array.isArray(chat.members) ? chat.members.filter(agent => validAgents.has(agent)) : !Array.isArray(parsed.sidebarAgents) && chat.messages.some(message => message?.kind === 'handoff') ? chat.messages.filter(message => message && message.sender !== 'you' && validAgents.has(message.sender)).map(message => message.sender as AgentId) : []
        const unique = [...new Set(members)]
        return unique.length >= 2 ? unique : undefined
      })(), messages: chat.messages.filter(message => message && typeof message.id === 'string' && typeof message.text === 'string' && (message.sender === 'you' || validAgents.has(message.sender))) })) : [],
    }
    const migrated = permanentChats(loaded.chats, agents)
    migratedChatIds = migrated.mapping
    return { ...loaded, chats: migrated.chats, selected: loaded.selected ? migrated.mapping[loaded.selected] ?? loaded.selected : null }
  } catch { return { ...initial, chats: permanentChats<Conversation>([], agents).chats } }
}

function Avatar({ profile, size = 34 }: { profile: Profile; size?: number }) {
  return profile.avatar
    ? <img className="user-avatar" src={profile.avatar} alt="Seu avatar" style={{ width: size, height: size }} />
    : <span className="user-avatar user-avatar-fallback" style={{ width: size, height: size }}>{(profile.nickname || profile.name || 'V').charAt(0).toUpperCase()}</span>
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'
  return <button className="theme-toggle" onClick={onToggle} aria-label={label} title={label}>{theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
}

function DemoMark() { return <span className="demo-mark"><span className="demo-dot" /> Demonstração local</span> }

function Onboarding({ profile, onDone, theme, onToggleTheme }: { profile: Profile; onDone: (next: Profile) => void; theme: Theme; onToggleTheme: () => void }) {
  return <div className="welcome-simple"><div className="welcome-theme"><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div><div className="welcome-center"><div className="welcome-identity"><Mascot agent="west" state="idle" size={120} /><h1>Wendler</h1></div><p>Sua equipe de ideias, em um só lugar.<br />Um espaço para criar, explorar e continuar.</p><button className="primary-button" onClick={() => onDone({ ...profile, name: profile.name || 'Visitante' })}>Vamos começar <ArrowRight size={17} /></button><small>Seu espaço pessoal, salvo neste navegador.</small></div></div>
}

export default function App() {
  const [data, setData, storageError] = useLocalStore<Stored>(key, load)
  const [showSearch, setShowSearch] = useState(false)
  const [teamEditor, setTeamEditor] = useState<string | null | false>(false)
  const [highlightMessage, setHighlightMessage] = useState<string | null>(null)
  const [contextLinks, setContextLinks, contextStorageError] = useLocalStore<Record<string, Partial<Record<AgentId, boolean>>>>('wendler:context-links:v1', () => { try { return JSON.parse(localStorage.getItem('wendler:context-links:v1') || '{}') } catch { return {} } })
  const [view, setView] = useState<View>('chat')
  const [welcomeFinished, setWelcomeFinished] = useState(false)
  const [activeAgent, setActiveAgent] = useState<AgentId>('west')
  const [editorAgent, setEditorAgent] = useState<AgentId>('west')
  const [draft, setDraft] = useState('')
  const [taskMode, setTaskMode] = useState(false)
  const [tasks, setTasks, taskStorageError] = useLocalStore(taskStorageKey, () => loadTasks(agents.map(agent => agent.id)))
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskPanelRequest, setTaskPanelRequest] = useState(0)
  const [attachment, setAttachment] = useState<Message['attachment']>()
  const [attachmentError, setAttachmentError] = useState('')
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [showPlugins, setShowPlugins] = useState(false)
  const [showWorkPanel, setShowWorkPanel] = useState(() => window.innerWidth > 1100)
  const [teamExpanded, setTeamExpanded] = useState(true)
  const [individualsExpanded, setIndividualsExpanded] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => { try { return localStorage.getItem('wendler:sidebar-collapsed') === 'true' } catch { return false } })
  useEffect(() => { try { localStorage.setItem('wendler:sidebar-collapsed', String(sidebarCollapsed)) } catch { /* Remains usable for this session. */ } }, [sidebarCollapsed])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [linkedThreads, setLinkedThreads, linkedStorageError] = useLocalStore(linkedStorageKey, () => migrateLinkedThreads(loadLinkedThreads(), migratedChatIds))
  const [draftConversationId] = useState(id)
  const [miniAgent, setMiniAgent] = useState<MascotAgent | null>(null)
  const [miniMinimized, setMiniMinimized] = useState(false)
  const [expressionAgent, setExpressionAgent] = useState<MascotAgent>('west')
  const [profileDraft, setProfileDraft] = useState<Profile>(data.profile)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const current = data.chats.find(chat => chat.id === data.selected) ?? data.chats.find(chat => !chat.members && chat.agent === activeAgent)
  const currentAgent = agentById(current?.agent ?? activeAgent)
  const teams = data.chats.filter(chat => chat.members && !chat.archived)
  const individualAgents = data.sidebarAgents.map(agentById)
  const chatName = current?.members ? current.title : currentAgent.name
  const contextId = current?.id ?? draftConversationId
  const attachmentContext = useRef(contextId)
  useEffect(() => { attachmentContext.current = contextId; setAttachment(undefined); setAttachmentError('') }, [contextId])
  const chatTasks = tasks.filter(task => task.chatId === contextId)
  const selectedTask = chatTasks.find(task => task.id === selectedTaskId) ?? chatTasks[0]
  const openTask = (task: ChatTask) => { setSelectedTaskId(task.id); setTaskPanelRequest(value => value + 1); setShowWorkPanel(true); setMiniAgent(null) }
  const changeTaskStatus = (taskId: string, status: TaskStatus) => {
    const task = tasks.find(task => task.id === taskId); if (!task || task.status === status) return
    const next = transitionTask(task, status); setTasks(previous => previous.map(item => item.id === taskId ? transitionTask(item, status, next.updated) : item))
    const notice: Message = { id: id(), sender: task.agent, text: `Demonstração: “${task.title}” — ${taskLabels[status]}.${status === 'done' ? ` Um rascunho local foi preparado em Arquivos.\n\n${next.result}` : status === 'blocked' ? ' Veja o motivo e o próximo passo no painel.' : ''}`, at: Date.now(), taskId }
    setData(previous => ({ ...previous, chats: previous.chats.map(chat => chat.id === task.chatId ? { ...chat, messages: [...chat.messages, notice], updated: notice.at } : chat) }))
  }
  const sharing = miniAgent ? contextLinks[contextId]?.[miniAgent] !== false : false
  const toggleSharing = () => { if (miniAgent) setContextLinks(previous => ({ ...previous, [contextId]: { ...previous[contextId], [miniAgent]: !(previous[contextId]?.[miniAgent] !== false) } })) }
  const miniThread = miniAgent ? linkedThreads[contextId]?.[miniAgent] ?? emptyMiniThread : emptyMiniThread
  const miniName = agents.find(agent => agent.id === miniAgent)?.name ?? ''
  const mainContext = (current?.messages ?? []).filter(message => message.kind !== 'context').map(message => ({ speaker: message.sender === 'you' ? 'Você' : agentById(message.sender).name, text: message.text || (message.attachment ? `Anexo local: ${message.attachment.name}` : '') }))
  const miniContext = miniThread.messages.map(message => ({ speaker: message.sender === 'you' ? 'Você' : miniName, text: message.text }))
  const updateMiniDraft = (draft: string) => {
    if (!miniAgent) return
    setLinkedThreads(previous => ({ ...previous, [contextId]: { ...previous[contextId], [miniAgent]: { ...(previous[contextId]?.[miniAgent] ?? emptyMiniThread), draft } } }))
  }
  const sendMini = () => {
    if (!miniAgent || !miniThread.draft.trim()) return
    const lastUser = [...(current?.messages ?? [])].reverse().find(message => message.sender === 'you')
    const receipt = !sharing ? 'Compartilhamento pausado: nenhum contexto do chat principal foi usado neste pedido.' : mainContext.length ? `Contexto recebido: ${mainContext.length} mensagens da conversa com ${currentAgent.name}.${lastUser ? ` Última mensagem sua: “${lastUser.text.slice(0, 180)}”.` : ''}` : `O vínculo com ${currentAgent.name} está ativo. Ainda não há mensagens enviadas no chat principal.`
    setLinkedThreads(previous => ({ ...previous, [contextId]: { ...previous[contextId], [miniAgent]: {
      draft: '', messages: [...(previous[contextId]?.[miniAgent]?.messages ?? []), { sender: 'you', text: miniThread.draft.trim() }, { sender: 'agent', text: `${receipt} Esta é uma confirmação demonstrativa; a IA ainda não está conectada.` }],
    } } }))
  }
  const displayName = data.profile.nickname || data.profile.name

  useEffect(() => { document.documentElement.dataset.theme = data.theme }, [data.theme])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [current?.messages.length])
  useEffect(() => { const onKey = (event: globalThis.KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setShowAgentPicker(true); setSidebarOpen(false) } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [])

  const startChat = (agent: AgentId = 'west') => {
    const chat = data.chats.find(chat => !chat.members && chat.agent === agent)
    if (!chat) return
    if (miniAgent === agent) setMiniAgent(null)
    setActiveAgent(agent); setData(previous => ({ ...previous, selected: chat.id })); setView('chat'); setSidebarOpen(false); setShowMenu(false); setShowAgentPicker(false)
    if (current?.id !== chat.id) { setDraft(''); setAttachment(undefined); setAttachmentError('') }
  }
  const openAgent = startChat
  const selectChat = (chat: Conversation) => { if (miniAgent === chat.agent) setMiniAgent(null); setData(prev => ({ ...prev, selected: chat.id })); setActiveAgent(chat.agent); setView('chat'); setSidebarOpen(false) }
  const send = (value = draft) => {
    const text = value.trim()
    if (!text && !attachment) return
    const mentions = mentionedAgents(text, agents)
    const source = current?.agent ?? activeAgent
    const target = mentions[0]?.id ?? source
    const snapshot = [...mainContext, ...(sharing ? miniContext : []), { speaker: displayName || 'Você', text }]
    const destinations = mentions.filter(agent => agent.id !== source)
    const now = Date.now()
    let routineConfirmation = ''
    try { const routine = createRoutineFromMessage(text, contextId); if (routine) { setShowWorkPanel(true); setMiniAgent(null); routineConfirmation = `Rotina “${routine.name}” criada: ${routine.frequency.toLowerCase()}, às ${routine.time}. Você pode ajustar no painel de trabalho. Configuração demonstrativa; execução automática ainda não conectada.` } } catch { routineConfirmation = 'Não foi possível salvar a rotina neste navegador. Tente novamente pelo painel de trabalho.' }
    const userMessage: Message = { id: id(), sender: 'you', text, at: now, attachment }
    const response: Message = { id: id(), sender: target, text: target === 'west'
      ? 'A ideia está viva, mas ainda não tem forma. Vamos começar com duas versões simples e ver qual merece continuar.'
      : target === 'ted' ? 'Vamos começar pelo que você quer guardar: a obra, a data e a sua impressão. Depois podemos dar forma à resenha.'
      : target === 'indy' ? 'Vejo uma pista interessante. Eu começaria pelas perguntas essenciais e separaria o que sabemos do que ainda precisamos descobrir.'
      : target === 'livro' ? 'Vamos olhar o contexto antes do placar. O que mais chamou sua atenção nessa partida?'
      : target === 'figma' ? 'Podemos testar duas direções visuais. Uma mais contida e outra mais expressiva; a comparação ajuda a escolher.'
      : `Recebi sua mensagem no espaço de ${agentById(target).name}. Esta resposta é demonstrativa; a IA ainda não está conectada.`, at: now + 1 }
    let task: ChatTask | undefined
    const transfer: Message | undefined = destinations.length ? { id: id(), sender: source, text: '', at: now + 1, kind: 'context', transfer: { from: currentAgent.name, to: destinations.map(agent => agent.name), entries: snapshot } } : undefined
    if (!routineConfirmation && (taskMode || mentions.length)) {
      task = { id: crypto.randomUUID(), chatId: contextId, agent: target, title: taskTitle(text), instruction: text || attachment?.name || '', status: 'thinking', created: now, updated: now, history: [{ status: 'thinking', at: now }], context: snapshot }
      setTasks(previous => [task!, ...previous]); setSelectedTaskId(task.id); setShowWorkPanel(true); setMiniAgent(null); response.taskId = task.id; response.text = `Pedido recebido por ${agentById(target).name}, com ${snapshot.length} mensagens de contexto disponíveis. A tarefa está pronta para explorar no painel. Esta é uma demonstração local, sem IA conectada.`
    }
    if (!task && current?.members) response.text = `Mensagem recebida no grupo ${current.title}. Os participantes compartilham este histórico do projeto. Resposta demonstrativa, sem IA conectada.`
    if (routineConfirmation) response.text = routineConfirmation
    if (miniAgent && sharing && miniContext.length) response.text += ` Contexto compartilhado: ${miniContext.length} mensagens de ${miniName} disponíveis nesta conversa (demonstração).`
    setData(prev => {
      const selected = prev.chats.find(chat => chat.id === current?.id)
      const newId = selected?.id ?? draftConversationId
      const messages = [...(selected?.messages ?? []), userMessage, ...(transfer ? [transfer] : []), response]
      const updated: Conversation = { id: newId, title: selected?.title ?? (text.length > 38 ? `${text.slice(0, 38)}…` : text), agent: source, members: selected?.members, archived: selected?.archived, messages, updated: now }
      return { ...prev, selected: newId, sidebarAgents: rememberContact(prev.sidebarAgents, source, Boolean(selected?.members)), chats: [updated, ...prev.chats.filter(chat => chat.id !== newId)] }
    })
    setDraft(''); setAttachment(undefined); setTaskMode(false)
  }
  const attachFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    if (file.size > 2_000_000) { setAttachmentError('Escolha um arquivo de até 2 MB.'); return }
    const chatId = contextId
    const reader = new FileReader(); reader.onload = () => { if (chatId !== attachmentContext.current) return; setAttachment({ name: file.name, size: file.size, data: String(reader.result) }); setAttachmentError('') }; reader.onerror = () => setAttachmentError('Não foi possível ler o arquivo.'); reader.readAsDataURL(file)
  }
  const addWorkNotice = (text: string) => {
    if (!current) return
    const notice: Message = { id: id(), sender: current.agent, text, at: Date.now(), kind: 'routine' }
    setData(previous => ({ ...previous, chats: previous.chats.map(chat => chat.id === current.id ? { ...chat, messages: [...chat.messages, notice], updated: notice.at } : chat) }))
  }
  const startTeamChat = () => setTeamEditor(null)
  const createTeam = (title: string, members: AgentId[]) => {
    const chat: Conversation = { id: crypto.randomUUID(), title, agent: members.includes('west') ? 'west' : members[0], members, messages: [], updated: Date.now() }
    setData(previous => ({ ...previous, selected: chat.id, chats: [chat, ...previous.chats] }))
    setActiveAgent(chat.agent); setView('chat'); setTeamExpanded(true); setDraft(''); setMiniAgent(null); setTeamEditor(false)
  }
  const archiveTeam = (teamId: string, archived: boolean) => {
    setData(previous => ({ ...previous, selected: archived && previous.selected === teamId ? previous.chats.find(chat => !chat.members && chat.agent === 'west')?.id ?? null : previous.selected, chats: previous.chats.map(chat => chat.id === teamId ? { ...chat, archived, updated: Date.now() } : chat) }))
    setShowMenu(false)
  }
  const searchSelect = (result: ConversationSearchResult) => {
    setShowSearch(false)
    if (result.taskId) { const task = chatTasks.find(task => task.id === result.taskId); if (task) openTask(task) }
    if (result.messageId) setHighlightMessage(result.messageId)
  }
  useEffect(() => {
    if (!highlightMessage) return
    const element = document.getElementById('message-' + highlightMessage)
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const timeout = setTimeout(() => setHighlightMessage(null), 4000)
    return () => clearTimeout(timeout)
  }, [highlightMessage])
  const updatePref = (agent: AgentId, patch: Partial<AgentPrefs[AgentId]>) => setData(prev => ({ ...prev, prefs: { ...prev.prefs, [agent]: { ...prev.prefs[agent], ...patch } } }))
  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2_000_000) { setProfileError('Escolha uma imagem de até 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { setProfileDraft(prev => ({ ...prev, avatar: String(reader.result) })); setProfileError(''); setProfileSaved(false) }
    reader.readAsDataURL(file)
  }
  const saveProfile = (event: FormEvent) => { event.preventDefault(); if (!profileDraft.name.trim()) { setProfileError('Seu nome é obrigatório.'); return }; setData(prev => ({ ...prev, profile: { ...profileDraft, name: profileDraft.name.trim(), nickname: profileDraft.nickname.trim() } })); setProfileError(''); setProfileSaved(true) }

  if (!data.onboarded) return <Onboarding theme={data.theme} onToggleTheme={() => setData(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))} profile={data.profile} onDone={profile => { setWelcomeFinished(true); setView('chat'); setData(prev => ({ ...prev, profile, onboarded: true })); setProfileDraft(profile) }} />

  return <div className={`app-shell chrome-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Navegação principal">
      <div className="sidebar-top"><button className="brand" onClick={() => startChat()} aria-label="Wendler, voltar ao início"><span className="wordmark-symbol">w.</span><span>wendler</span></button><button className="sidebar-collapse" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'} title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'} aria-expanded={!sidebarCollapsed}><PanelLeft size={18} /></button><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div>
      <button aria-label="Escolher agente" title="Escolher agente" className="new-chat" onClick={() => { setShowAgentPicker(true); setSidebarOpen(false) }}><MessageCircle size={18} /> Conversar <span className="new-chat-key">Ctrl K</span></button>
      <div className="sidebar-content">
      <nav className="main-nav" aria-label="Seções"><button aria-label="Conversas" title="Conversas" className={view === 'chat' ? 'nav-item selected' : 'nav-item'} onClick={() => { setView('chat'); setSidebarOpen(false) }}><MessageCircle size={18} /> Conversas</button><button aria-label="Equipe" title="Equipe" className={view === 'team' ? 'nav-item selected' : 'nav-item'} onClick={() => { setView('team'); setSidebarOpen(false) }}><Users size={18} /> Equipe</button><button aria-label="Expressões" title="Expressões" className={view === 'expressions' ? 'nav-item selected' : 'nav-item'} onClick={() => { setView('expressions'); setSidebarOpen(false) }}><Sparkles size={18} /> Expressões</button></nav>
      <button className="team-group-toggle" aria-label="Individuais" title="Individuais" aria-expanded={individualsExpanded} aria-controls="sidebar-individuals" onClick={() => { if (sidebarCollapsed) { setSidebarCollapsed(false); setIndividualsExpanded(true) } else setIndividualsExpanded(value => !value) }}><MessageCircle size={17} /><span>Individuais</span><small>{individualAgents.length}</small><ChevronDown size={15} /></button>
      {individualsExpanded && <div id="sidebar-individuals" className="roster individual-roster">{individualAgents.map(agent => <button title={agent.name} aria-label={`Conversar com ${agent.name}`} className={`roster-row ${view === 'chat' && !current?.members && currentAgent.id === agent.id ? 'active' : ''}`} key={agent.id} onClick={() => openAgent(agent.id)}><span className="roster-mascot"><Mascot agent={agent.id} animated size={35} accessory={data.prefs[agent.id].accessory} /></span><span className="roster-copy"><strong>{agent.name}</strong><small>{agent.role}</small></span></button>)}</div>}
      <button className="team-group-toggle" aria-label="Minha equipe" title="Minha equipe" aria-expanded={teamExpanded} aria-controls="sidebar-teams" onClick={() => { if (sidebarCollapsed) { setSidebarCollapsed(false); setTeamExpanded(true) } else setTeamExpanded(value => !value) }}><Users size={17} /><span>Minha equipe</span><small>{teams.length}</small><ChevronDown size={15} /></button>
      {teamExpanded && <div id="sidebar-teams" className="project-teams">{teams.map(team => <div className="project-team" key={team.id}><button className={`project-team__title ${current?.id === team.id ? 'active' : ''}`} onClick={() => selectChat(team)} title={team.title}><Users size={15} /><span>{team.title}</span></button><details><summary>Participantes · {team.members!.length}</summary><div className="project-team__members">{team.members!.map(member => <button key={member} onClick={() => openAgent(member)} title={`Conversa individual com ${agentById(member).name}`}><Mascot agent={member} animated size={25} /><span>{agentById(member).name}</span></button>)}</div></details></div>)}<button className="manage-teams text-action" onClick={() => setTeamEditor(null)}><Users size={14} /> Gerenciar equipes</button>{!teams.length && <p className="sidebar-empty">Seus grupos de trabalho aparecerão aqui.</p>}</div>}
      </div>
      <div className="sidebar-bottom"><button className="settings-link" aria-label="Plugins" title="Plugins" onClick={() => { setShowPlugins(true); setSidebarOpen(false) }}><Plug size={18} /> Plugins</button><button aria-label="Ajustes" title="Ajustes" className="settings-link" onClick={() => { setView('settings'); setSidebarOpen(false); setProfileDraft(data.profile) }}><Settings2 size={18} /> Ajustes</button><button aria-label="Seu perfil" title="Seu perfil" className="account" onClick={() => { setView('settings'); setSidebarOpen(false); setProfileDraft(data.profile) }}><Avatar profile={data.profile} /><span><strong>{displayName}</strong><small>Seu espaço pessoal</small></span><ChevronRight size={16} /></button></div>
    </aside>
    {showPlugins && <PluginsDialog onClose={() => setShowPlugins(false)} />}
    {showSearch && <SearchConversation title={chatName} messages={current?.messages ?? []} tasks={chatTasks} onClose={() => setShowSearch(false)} onSelect={searchSelect} />}
    {teamEditor !== false && <ProjectTeams key={teamEditor ?? 'new'} initialTeamId={teamEditor ?? undefined} teams={data.chats.filter(chat => chat.members).map(chat => ({ id: chat.id, title: chat.title, members: chat.members!, archived: chat.archived }))} agents={agents} onClose={() => setTeamEditor(false)} onCreate={createTeam} onUpdate={(teamId, patch) => setData(previous => ({ ...previous, chats: previous.chats.map(chat => chat.id === teamId ? { ...chat, ...patch, agent: patch.members.includes(chat.agent) ? chat.agent : patch.members[0], updated: Date.now() } : chat) }))} onArchive={archiveTeam} onOpen={teamId => { const chat = data.chats.find(chat => chat.id === teamId); if (chat) selectChat(chat); setTeamEditor(false) }} />}
    {showAgentPicker && <AgentPicker agents={agents} onChoose={startChat} onClose={() => setShowAgentPicker(false)} />}
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />}
    <main className={`workspace${miniAgent && !miniMinimized && view === 'chat' ? ' workspace--parallel' : ''}`}>{(storageError || taskStorageError || contextStorageError) && <div className="storage-alert" role="alert">Não foi possível salvar neste navegador. Suas alterações continuam disponíveis nesta sessão.</div>}
      <WorkspaceTabs view={view} forceInitialView={welcomeFinished} onViewChange={next => { setView(next); setSidebarOpen(false) }} />
      <div id="workspace-tab-panel" role="tabpanel" aria-label="Página ativa" className="workspace-panel">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={15} /><strong>{view === 'chat' ? current ? current.title : 'Nova conversa' : view === 'team' ? 'Equipe' : view === 'expressions' ? 'Expressões' : 'Ajustes'}</strong></div><div className="topbar-actions"><TeamQuickMenu agents={agents} currentAgent={view === 'chat' ? currentAgent.id : undefined} onChoose={agent => { setMiniAgent(agent); setMiniMinimized(false) }} /><DemoMark /><ThemeToggle theme={data.theme} onToggle={() => setData(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))} /><button className="help-button" title="Sobre esta versão" onClick={() => setView('settings')} aria-label="Sobre esta versão"><CircleHelp size={18} /></button><Avatar profile={data.profile} size={31} /></div></header>
      {view === 'chat' && <div className="chat-layout"><div className="chat-page">
        <div className="chat-heading"><div className="chat-heading-agent"><div className="heading-avatar"><Mascot agent={currentAgent.id} size={43} accessory={data.prefs[currentAgent.id].accessory} /></div><div><h2>{current ? chatName : activeAgent === 'west' ? 'Converse com Ash' : `Converse com ${currentAgent.name}`}</h2><span>{current?.members ? 'Grupo de projeto' : currentAgent.role} <span className="heading-divider">·</span> {current?.members ? `${current.members.length} participantes` : 'Disponível'}</span></div></div><div className="chat-heading-actions"><button className="icon-button" aria-label="Buscar nesta conversa" title="Buscar nesta conversa" onClick={() => setShowSearch(true)}><Search size={18} /></button><button className="icon-button work-toggle" aria-label="Alternar painel de trabalho" title="Painel de trabalho" aria-expanded={showWorkPanel && !miniAgent} onClick={() => { setShowWorkPanel(value => !value); setMiniAgent(null) }}><Monitor size={18} /></button><button className="agent-picker" onClick={() => setShowAgentPicker(true)} title="Escolher agente"><Users size={16} /><span>Escolher agente</span></button>{current?.members && <div className="menu-wrap"><button className="icon-button" onClick={() => setShowMenu(!showMenu)} aria-label="Mais opções" aria-expanded={showMenu}><MoreHorizontal size={21} /></button>{showMenu && <div className="popover"><button onClick={() => { setTeamEditor(current.id); setShowMenu(false) }}><Settings2 size={15} /> Editar equipe</button><button onClick={() => archiveTeam(current.id, true)}><Trash2 size={15} /> Arquivar equipe</button></div>}</div>}</div></div>
        {current?.members && <div className="chat-team-members">{current.members.map(member => <span key={member}><Mascot agent={member} size={25} />{agentById(member).name}</span>)}</div>}
        {miniAgent && <SharedContext name={miniName} messages={miniContext} enabled={sharing} onToggle={toggleSharing} />}
        <div className={`chat-body ${current ? 'has-messages' : ''}`}>
          {!current?.messages.length ? <div className="empty-chat"><div className="empty-visual"><div className="empty-halo" /><Mascot agent={activeAgent} state="idle" size={174} accessory={data.prefs[activeAgent].accessory} /></div><span className="eyebrow">SEU ESPAÇO DE IDEIAS</span><h1>{activeAgent === 'west' ? 'Grandes ideias começam\ncom uma conversa.' : `Uma conversa com ${currentAgent.name}\npode abrir caminhos.`}</h1><p>{activeAgent === 'west' ? 'Conte o que está na sua cabeça. Ash ajuda a encontrar o caminho e reúne a equipe quando fizer sentido.' : currentAgent.tagline}</p><div className="prompt-grid"><button onClick={() => send('Quero começar um projeto novo. Pode me ajudar a organizar as ideias?')}><Feather size={17} /> Organizar uma ideia <ArrowUp size={15} /></button><button onClick={() => send('Quero explorar um assunto e entender por onde começar.')}><Search size={17} /> Explorar um assunto <ArrowUp size={15} /></button><button onClick={() => send('Me apresente o que cada pessoa da equipe pode fazer.')}><Users size={17} /> Conhecer a equipe <ArrowUp size={15} /></button></div>{activeAgent === 'west' && !current?.members && <button className="team-demo-button" onClick={startTeamChat}><Users size={16} /> Ver uma conversa em equipe <ArrowRight size={16} /></button>}</div> : <div className="message-list" aria-live="polite"><ChatMessages highlightId={highlightMessage} messages={current.messages} agents={agents} tasks={chatTasks} onTask={openTask} accessory={agent => data.prefs[agent].accessory} /><div ref={bottomRef} /></div>}
        </div>
        <div className="composer-area">{attachmentError && <p className="field-error" role="alert">{attachmentError}</p>}<div className="composer">{attachment && <div className="attachment-draft"><FileText size={15} /><span>{attachment.name}</span><button className="icon-button" aria-label="Remover anexo" onClick={() => setAttachment(undefined)}><X size={14} /></button></div>}<MentionComposer agents={agents} value={draft} onChange={setDraft} onSend={() => send()} placeholder={`Escreva para ${chatName}... (@ para mencionar)`} /><div className="composer-footer"><label className="attach-button" title="Anexar arquivo local"><Paperclip size={17} /><input type="file" aria-label="Anexar arquivo local" onChange={attachFile} /></label><button className="task-mode-button" aria-pressed={taskMode} onClick={() => setTaskMode(value => !value)}><Check size={13} /> Criar tarefa</button><div className="composer-note">Demonstração local</div><button className="send-button" onClick={() => send()} disabled={!draft.trim() && !attachment} aria-label="Enviar mensagem"><ArrowUp size={19} /></button></div></div><div className="composer-under">Enter para enviar <span>·</span> Shift + Enter para pular linha</div></div>
      </div>{showWorkPanel && !miniAgent && <WorkPanel chatId={contextId} agent={selectedTask?.agent ?? currentAgent.id} name={selectedTask ? agentById(selectedTask.agent).name : currentAgent.name} onClose={() => setShowWorkPanel(false)} onNotice={addWorkNotice} tasks={chatTasks} openRequest={taskPanelRequest} selectedTask={selectedTask} onSelectTask={openTask} onTaskStatus={changeTaskStatus} agentName={agent => agentById(agent).name} files={(current?.messages ?? []).flatMap(message => message.attachment ? [message.attachment] : [])} />}</div>}
      {view === 'team' && <section className="content-page team-page"><div className="page-intro"><span className="eyebrow">AS PESSOAS CERTAS PARA CADA IDEIA</span><h1>Conheça a equipe.</h1><p>Cada personagem tem uma área de atuação. A personalidade e as capacidades serão construídas com cuidado, um passo de cada vez.</p></div><button className="outline-button" onClick={() => setTeamEditor(null)}><Users size={16} /> Equipes de projeto</button><div className="team-list">{agents.map((agent, index) => <article className="team-row" key={agent.id}><span className="team-index">0{index + 1}</span><div className="team-mascot"><Mascot agent={agent.id} state="idle" size={92} accessory={data.prefs[agent.id].accessory} /></div><div className="team-info"><span className="eyebrow">{agent.role}</span><h2>{agent.name}</h2><p>{agent.tagline}</p></div><div className="team-buttons"><button className="text-action" onClick={() => { setEditorAgent(agent.id); setView('settings') }}>Personalizar <Settings2 size={16} /></button><button className="round-action" onClick={() => openAgent(agent.id)} aria-label={`Conversar com ${agent.name}`}><ArrowRight size={19} /></button></div></article>)}</div><div className="team-callout"><div><strong>Veja a equipe em ação</strong><span>Uma conversa ilustrativa com Ash, Indiana e Figma.</span></div><button className="primary-button" onClick={startTeamChat}>Reunir equipe <ArrowRight size={16} /></button></div><div className="team-note"><Sparkles size={18} /><span>Estes são personagens de interface. A conexão com o motor de IA e as ferramentas virá em uma etapa futura.</span></div></section>}
      {view === 'expressions' && <section className="content-page expressions-page"><div className="page-intro"><span className="eyebrow">PEQUENOS SINAIS, GRANDES CONVERSAS</span><h1>Um rosto para cada momento.</h1><p>As expressões ajudam a entender o que a equipe está fazendo. Explore os estados de cada mascote.</p></div><div className="expression-controls"><span>Personagem</span><div className="agent-tabs">{agents.map(agent => <button key={agent.id} className={expressionAgent === agent.id ? 'active' : ''} onClick={() => setExpressionAgent(agent.id)}>{agent.name}</button>)}</div></div><div className="sketch-studies"><div><span className="eyebrow">ELENCO EM CONSTRUÇÃO</span><p>Os 18 personagens do documento estão reunidos aqui. Livro e Figma também estão disponíveis nas abas acima. Estudos visuais: selecione um e mova o cursor. Após oito segundos sem movimento, eles procuram por você.</p></div><div className="sketch-roster">{sketchAgents.map(agent => <button key={agent.id} className={expressionAgent === agent.id ? 'active' : ''} onClick={() => setExpressionAgent(agent.id)} aria-pressed={expressionAgent === agent.id}><Mascot agent={agent.id} size={72} /><span>{agent.name}</span></button>)}</div></div><div className="expression-grid">{mascotStates.map((state, index) => <div className="expression-tile" key={state.id}><span className="tile-number">{String(index + 1).padStart(2, '0')}</span><Mascot agent={expressionAgent} state={state.id as MascotState} size={100} accessory={data.prefs[expressionAgent as AgentId]?.accessory ?? true} /><strong>{state.label}</strong></div>)}</div></section>}
      {view === 'settings' && <section className="content-page settings-page"><div className="page-intro"><span className="eyebrow">DO SEU JEITO</span><h1>Ajustes.</h1><p>Personalize seu espaço e o jeito como a equipe aparece por aqui.</p></div><div className="settings-layout"><nav className="settings-subnav" aria-label="Categorias de ajustes"><a href="#perfil"><Users size={17} /> Seu perfil</a><a href="#aparencia"><Sun size={17} /> Aparência</a><a href="#personagens"><Sparkles size={17} /> Personagens</a><a href="#backup"><FileText size={17} /> Backup</a><a href="#sobre"><CircleHelp size={17} /> Sobre</a></nav><div className="settings-content"><section id="perfil" className="settings-section"><div className="section-head"><div><h2>Seu perfil</h2><p>Como a equipe vê você neste navegador.</p></div></div><form onSubmit={saveProfile}><div className="profile-photo-row"><Avatar profile={profileDraft} size={62} /><div><button type="button" className="outline-button" onClick={() => document.getElementById('profile-upload')?.click()}><ImagePlus size={16} /> Trocar foto</button><input id="profile-upload" type="file" accept="image/*" hidden onChange={handleAvatar} />{profileDraft.avatar && <button type="button" className="bare-button" onClick={() => { setProfileDraft(prev => ({ ...prev, avatar: '' })); setProfileSaved(false) }}>Remover</button>}</div></div><div className="profile-fields"><label>Nome<input className="text-input" value={profileDraft.name} onChange={event => { setProfileDraft(prev => ({ ...prev, name: event.target.value })); setProfileSaved(false) }} /></label><label>Apelido<input className="text-input" value={profileDraft.nickname} onChange={event => { setProfileDraft(prev => ({ ...prev, nickname: event.target.value })); setProfileSaved(false) }} placeholder="Como prefere ser chamado" /></label></div>{profileError && <p className="field-error" role="alert">{profileError}</p>}<button className="primary-button" type="submit">{profileSaved ? <Check size={17} /> : null}{profileSaved ? 'Salvo' : 'Salvar perfil'}</button></form></section><section id="aparencia" className="settings-section"><div className="section-head"><div><h2>Aparência</h2><p>Escolha o clima do seu espaço.</p></div></div><div className="theme-options"><button className={data.theme === 'light' ? 'theme-option active' : 'theme-option'} onClick={() => setData(prev => ({ ...prev, theme: 'light' }))}><div className="theme-preview theme-light"><span /><span /><span /></div><span><Sun size={17} /> Claro e acolhedor</span>{data.theme === 'light' && <Check size={17} />}</button><button className={data.theme === 'dark' ? 'theme-option active' : 'theme-option'} onClick={() => setData(prev => ({ ...prev, theme: 'dark' }))}><div className="theme-preview theme-dark"><span /><span /><span /></div><span><Moon size={17} /> Escuro e tranquilo</span>{data.theme === 'dark' && <Check size={17} />}</button></div></section><section id="personagens" className="settings-section"><div className="section-head"><div><h2>Personagens</h2><p>Pequenos ajustes de apresentação. A identidade de cada um permanece a mesma.</p></div></div><div className="settings-agent-tabs">{agents.map(agent => <button key={agent.id} className={editorAgent === agent.id ? 'active' : ''} onClick={() => setEditorAgent(agent.id)}>{agent.name}</button>)}</div><div className="agent-config"><div className="config-preview"><Mascot agent={editorAgent} state="idle" size={138} accessory={data.prefs[editorAgent].accessory} /><strong>{agentById(editorAgent).name}</strong><span>{agentById(editorAgent).role}</span></div><div className="config-fields"><label className="select-label">Tom de conversa <span className="select-wrap"><select value={data.prefs[editorAgent].tone} onChange={event => updatePref(editorAgent, { tone: event.target.value })}><option>Criativo</option><option>Acolhedor</option><option>Curioso</option><option>Direto</option><option>Claro</option><option>Calmo</option></select><ChevronDown size={16} /></span></label><label className="select-label">Humor <span className="select-wrap"><select value={data.prefs[editorAgent].humor} onChange={event => updatePref(editorAgent, { humor: event.target.value })}><option>Sutil</option><option>Equilibrado</option><option>Divertido</option></select><ChevronDown size={16} /></span></label><label className="toggle-row"><span><strong>Mostrar acessório</strong><small>Uma pequena marca visual do personagem.</small></span><input type="checkbox" checked={data.prefs[editorAgent].accessory} onChange={event => updatePref(editorAgent, { accessory: event.target.checked })} /><span className="switch" /></label><p className="config-disclaimer">Essas preferências são visuais nesta demonstração. Elas não alteram respostas de IA.</p></div></div></section><BackupSettings agents={agents.map(agent => agent.id)} /><section id="sobre" className="settings-section about-section"><div className="section-head"><div><h2>Sobre esta versão</h2><p>Uma primeira cena para sentir o Wendler em movimento.</p></div></div><div className="about-line"><span>Wendler · Interface demonstrativa</span><span>v0.1</span></div><p>Conversas, perfil e ajustes são guardados localmente neste navegador. Não há IA, login ou serviços externos conectados nesta versão.</p><button className="text-action" onClick={() => { setData(prev => ({ ...prev, onboarded: false })); setView('chat') }}>Rever boas-vindas <ArrowRight size={16} /></button></section></div></div></section>}
      <MiniAgentChat sharing={sharing} onToggleSharing={toggleSharing} agent={miniAgent ? agents.find(agent => agent.id === miniAgent) ?? null : null} mainName={chatName} thread={miniThread} mainMessages={mainContext} onDraft={updateMiniDraft} onSend={sendMini} storageError={linkedStorageError} minimized={miniMinimized} onMinimize={() => setMiniMinimized(value => !value)} onClose={() => setMiniAgent(null)} />
      </div>
    </main>
  </div>
}


