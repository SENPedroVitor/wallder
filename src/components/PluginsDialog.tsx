import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  BarChart3, BookOpen, BriefcaseBusiness, CalendarDays, Check, ChevronRight,
  Cloud, Code2, CreditCard, Database, FileText, HardDrive, Inbox, Layers3,
  Mail, MessageSquare, Palette, Plus, Search, ShieldCheck, X,
} from 'lucide-react'
import './PluginsDialog.css'
import { useLocalStore } from '../useLocalStore'

type Icon = ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>
type Category = 'Orquestração de agentes' | 'Canvas' | 'Suporte ao cliente' | 'Análise de dados' | 'Design' | 'Finanças e jurídico' | 'Caixa de entrada e colaboração' | 'Infraestrutura' | 'MCP' | 'Pagamentos' | 'Produtividade' | 'Pesquisa' | 'Vendas' | 'Agendamento'
type Plugin = { id: string; name: string; description: string; category: Category; group: 'featured' | 'team' | 'other'; icon: Icon; color: string; team?: boolean }

const storageKey = 'wendler:plugins:v1'
const categories = ['Todos', 'Destaques', 'Plugins da equipe', 'Orquestração de agentes', 'Canvas', 'Suporte ao cliente', 'Análise de dados', 'Design', 'Finanças e jurídico', 'Caixa de entrada e colaboração', 'Infraestrutura', 'MCP', 'Pagamentos', 'Produtividade', 'Pesquisa', 'Vendas', 'Agendamento'] as const
type Filter = typeof categories[number]

const plugins: Plugin[] = [
  { id: 'figma', name: 'Figma', description: 'Traga arquivos de design para sua equipe.', category: 'Design', group: 'other', icon: Palette, color: 'violet' },
  { id: 'youtube', name: 'YouTube', description: 'Organize vídeos, referências e resumos.', category: 'Pesquisa', group: 'other', icon: BookOpen, color: 'coral' },
  { id: 'telegram', name: 'Telegram', description: 'Acompanhe conversas e avisos da equipe.', category: 'Caixa de entrada e colaboração', group: 'other', icon: MessageSquare, color: 'blue' },
  { id: 'gmail', name: 'Gmail', description: 'Leia, escreva e organize e-mails.', category: 'Caixa de entrada e colaboração', group: 'featured', icon: Mail, color: 'coral' },
  { id: 'calendar', name: 'Google Calendar', description: 'Encontre eventos e planeje reuniões.', category: 'Agendamento', group: 'featured', icon: CalendarDays, color: 'blue' },
  { id: 'drive', name: 'Google Drive', description: 'Busque, leia, crie e compartilhe arquivos.', category: 'Produtividade', group: 'featured', icon: HardDrive, color: 'green' },
  { id: 'granola', name: 'Granola', description: 'Suas reuniões no fluxo de trabalho.', category: 'Produtividade', group: 'featured', icon: FileText, color: 'lime' },
  { id: 'claude-migration', name: 'claude-opus-4-5-migration', description: 'Migre seu código com apoio da equipe.', category: 'Orquestração de agentes', group: 'team', icon: Code2, color: 'neutral', team: true },
  { id: 'frontend-design', name: 'frontend-design', description: 'Crie interfaces distintas e prontas para produção.', category: 'Design', group: 'team', icon: Palette, color: 'neutral', team: true },
  { id: 'canvas', name: 'Canvas', description: 'Explore ideias e organize esboços visuais.', category: 'Canvas', group: 'other', icon: Layers3, color: 'violet' },
  { id: 'support', name: 'Central de suporte', description: 'Acompanhe solicitações de clientes.', category: 'Suporte ao cliente', group: 'other', icon: MessageSquare, color: 'teal' },
  { id: 'analytics', name: 'Análise de dados', description: 'Leia métricas e compare resultados.', category: 'Análise de dados', group: 'other', icon: BarChart3, color: 'blue' },
  { id: 'legal', name: 'Documentos jurídicos', description: 'Organize contratos e documentos.', category: 'Finanças e jurídico', group: 'other', icon: ShieldCheck, color: 'sand' },
  { id: 'inbox', name: 'Caixa compartilhada', description: 'Reúna mensagens e conversas.', category: 'Caixa de entrada e colaboração', group: 'other', icon: Inbox, color: 'coral' },
  { id: 'cloud', name: 'Infraestrutura', description: 'Consulte serviços e ambientes.', category: 'Infraestrutura', group: 'other', icon: Cloud, color: 'blue' },
  { id: 'mcp', name: 'Servidor MCP', description: 'Descubra ferramentas disponíveis.', category: 'MCP', group: 'other', icon: Database, color: 'violet' },
  { id: 'payments', name: 'Pagamentos', description: 'Acompanhe cobranças e transações.', category: 'Pagamentos', group: 'other', icon: CreditCard, color: 'green' },
  { id: 'research', name: 'Pesquisa', description: 'Organize fontes e referências.', category: 'Pesquisa', group: 'other', icon: BookOpen, color: 'sand' },
  { id: 'sales', name: 'Vendas', description: 'Acompanhe oportunidades e clientes.', category: 'Vendas', group: 'other', icon: BriefcaseBusiness, color: 'teal' },
]

const brandedPlugins = new Set(['figma', 'youtube', 'telegram', 'gmail', 'calendar', 'drive', 'claude-migration', 'granola'])
function PluginIcon({ plugin, size = 22 }: { plugin: Plugin; size?: number }) {
  const IconComponent = plugin.icon
  return brandedPlugins.has(plugin.id) ? <img className="plugin-brand-logo" src={`/brands/${plugin.id}.${plugin.id === 'granola' ? 'png' : 'svg'}`} alt="" width={size} height={size} /> : <IconComponent size={size} strokeWidth={2.2} />
}
function readInstalled(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && plugins.some(plugin => plugin.id === id)) : []
  } catch { return [] }
}

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export default function PluginsDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('Todos')
  const [installed, setInstalled, storageError] = useLocalStore<string[]>(storageKey, readInstalled)
  const [onlyInstalled, setOnlyInstalled] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    element.showModal()
    return () => element.close()
  }, [])

  const visible = useMemo(() => {
    const term = fold(query.trim())
    return plugins.filter(plugin => {
      const inCategory = filter === 'Todos' || (filter === 'Destaques' && plugin.group === 'featured') || (filter === 'Plugins da equipe' && plugin.group === 'team') || plugin.category === filter
      return (!onlyInstalled || installed.includes(plugin.id)) && inCategory && (!term || fold(`${plugin.name} ${plugin.description} ${plugin.category}`).includes(term))
    })
  }, [filter, query, onlyInstalled, installed])

  const sections = filter === 'Todos'
    ? [
        { label: 'Destaques', items: visible.filter(plugin => plugin.group === 'featured') },
        { label: 'Plugins da equipe', items: visible.filter(plugin => plugin.group === 'team') },
        { label: 'Mais plugins', items: visible.filter(plugin => plugin.group === 'other') },
      ]
    : [{ label: filter, items: visible }]

  const togglePlugin = (id: string) => {
    setInstalled(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
      return next
    })
  }

  return <dialog ref={dialog} className="plugins-dialog" aria-labelledby="plugins-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="plugins-dialog__shell">
      <header className="plugins-dialog__header">
        <div><h2 id="plugins-title">Plugins</h2><p>Catálogo de demonstração local; nenhuma ferramenta está conectada.</p></div>
        <button type="button" className="plugins-dialog__close" aria-label="Fechar plugins" onClick={onClose}><X size={19} /></button>
      </header>

      <button className="plugins-dialog__installed" aria-pressed={onlyInstalled} onClick={() => { setOnlyInstalled(value => !value); setFilter('Todos') }} aria-live="polite">
        <span className="plugins-dialog__icon-stack" aria-hidden="true">{plugins.filter(plugin => installed.includes(plugin.id)).slice(0,4).map(plugin => <PluginIcon key={plugin.id} plugin={plugin} size={21} />)}</span>
        <span>{installed.length} {installed.length === 1 ? 'instalado' : 'instalados'}</span><ChevronRight size={13} aria-hidden="true" />
      </button>

      <div className="plugins-dialog__search"><Search size={17} aria-hidden="true" /><input autoFocus type="search" aria-label="Buscar plugins" placeholder="Buscar plugins" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <nav className="plugins-dialog__filters" aria-label="Categorias de plugins">{categories.map(category => <button key={category} type="button" aria-pressed={!onlyInstalled && filter === category} className={!onlyInstalled && filter === category ? 'is-active' : ''} onClick={() => { setFilter(category); setOnlyInstalled(false) }}>{category}</button>)}</nav>
      {onlyInstalled && <p className="plugins-dialog__empty">Mostrando plugins adicionados localmente.</p>}
      {storageError && <p className="field-error" role="alert">Não foi possível salvar os plugins neste navegador.</p>}

      <div className="plugins-dialog__results">
        {sections.map(section => section.items.length > 0 && <section className="plugins-dialog__section" key={section.label} aria-label={section.label}>
          <div className="plugins-dialog__section-heading"><h3>{section.label}</h3>{section.label === 'Destaques' && filter === 'Todos' && <button type="button" onClick={() => setFilter('Destaques')}>Ver todos</button>}</div>
          <div className="plugins-dialog__list">{section.items.map(plugin => {
            const active = installed.includes(plugin.id)
            return <div className="plugins-dialog__row" key={plugin.id}>
              <span className={`plugins-dialog__plugin-icon plugins-dialog__plugin-icon--${brandedPlugins.has(plugin.id) ? 'brand' : plugin.color}`} aria-hidden="true"><PluginIcon plugin={plugin} /></span>
              <div className="plugins-dialog__plugin-copy"><div className="plugins-dialog__plugin-name"><strong>{plugin.name}</strong>{plugin.team && <span className="plugins-dialog__team-tag">Equipe</span>}</div><p>{plugin.description}</p></div>
              <button type="button" className={`plugins-dialog__add${active ? ' is-installed' : ''}`} aria-label={`${active ? 'Remover' : 'Adicionar'} ${plugin.name}`} aria-pressed={active} onClick={() => togglePlugin(plugin.id)}>{active ? <><Check size={13} />Adicionado</> : <><Plus size={13} />Adicionar</>}</button>
            </div>
          })}</div>
        </section>)}
        {!visible.length && <p className="plugins-dialog__empty">Nenhum plugin encontrado.</p>}
      </div>
    </div>
  </dialog>
}
