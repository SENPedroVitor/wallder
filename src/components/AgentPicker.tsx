import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import Mascot, { type MascotAgent } from './Mascot'
import './agent-navigation.css'

export default function AgentPicker({ agents, onChoose, onClose }: {
  agents: { id: MascotAgent; name: string; role: string }[]
  onChoose: (agent: MascotAgent) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  const visible = agents.filter(agent => `${agent.name} ${agent.role}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  return <dialog ref={dialog} className="agent-dialog" aria-labelledby="agent-picker-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="agent-dialog__header"><div><h2 id="agent-picker-title">Com quem vamos conversar?</h2><p>Cada agente tem um único chat. Escolha com quem falar.</p></div><button className="icon-button" aria-label="Fechar escolha de agente" onClick={onClose}><X size={20} /></button></div>
    <label className="agent-dialog__search"><Search size={18} /><input autoFocus aria-label="Buscar agente" placeholder="Buscar por nome ou função" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="agent-dialog__grid">{visible.map(agent => <button key={agent.id} onClick={() => onChoose(agent.id)} aria-label={`Abrir chat de ${agent.name}`}><Mascot agent={agent.id} size={48} /><span><strong>{agent.name}</strong><small>{agent.role}</small></span></button>)}</div>
    {!visible.length && <p className="agent-dialog__empty">Nenhum agente encontrado.</p>}
    <p className="agent-dialog__note">18 personagens · Livro e Figma também disponíveis</p>
  </dialog>
}
