import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import Mascot, { type MascotAgent } from './Mascot'
import './team-quick-menu.css'

export default function TeamQuickMenu<T extends MascotAgent>({ agents, onChoose, currentAgent }: {
  agents: { id: T; name: string; role?: string }[]
  onChoose: (id: T) => void
  currentAgent?: T
}) {
  const available = agents.filter(agent => agent.id !== currentAgent)
  const currentName = agents.find(agent => agent.id === currentAgent)?.name
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const panelId = useId()
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLButtonElement>('[data-agent-choice]')?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return <div className="team-quick" ref={root} data-open={open} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
  }}>
    <button ref={trigger} className="team-quick__trigger" aria-expanded={open} aria-controls={open ? panelId : undefined}
      aria-haspopup="dialog" aria-label="Chamar equipe" onClick={() => setOpen(value => !value)}>
      <span>Chamar equipe</span><Mascot agent="west" size={38} animated={open} />
    </button>
    {open && <div ref={panel} id={panelId} className="team-quick__panel" role="dialog" aria-labelledby={titleId}>
      <button className="team-quick__close" aria-label="Fechar chamada da equipe" onClick={() => { setOpen(false); trigger.current?.focus() }}><X size={16} /></button>
      <h2 id={titleId}>Uma ideia. A companhia certa.</h2>
      <p>{currentName ? `Você continua com ${currentName}. Chame outro agente ao lado.` : 'Abra uma consulta rápida sem trocar de tela.'}</p>
      <div className="team-quick__agents">{available.map(agent => <button key={agent.id} data-agent-choice
        aria-label={`Chamar ${agent.name}`} title={agent.role} onClick={() => { setOpen(false); onChoose(agent.id) }}>
        <Mascot agent={agent.id} size={43} animated={open} /><span>{agent.name}</span><ArrowUpRight className="team-quick__arrow" size={12} />
      </button>)}</div>
      <small>{available.length} agentes disponíveis · mini chat em paralelo</small>
      <small>Abra uma conversa ao lado e compartilhe contexto quando quiser.</small>
    </div>}
  </div>
}
