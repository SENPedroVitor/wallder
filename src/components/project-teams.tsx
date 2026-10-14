import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Check, Pencil, Plus, Users, X } from 'lucide-react'
import type { MascotAgent } from './Mascot'
import './project-teams.css'

export type ProjectTeam = { id: string; title: string; members: MascotAgent[]; archived?: boolean }
export type ProjectTeamAgent = { id: MascotAgent; name: string; role: string }
export type ProjectTeamsProps = { teams: ProjectTeam[]; agents: ProjectTeamAgent[]; initialTeamId?: string; onClose: () => void; onCreate: (title: string, members: MascotAgent[]) => void; onUpdate: (id: string, patch: { title: string; members: MascotAgent[] }) => void; onArchive: (id: string, archived: boolean) => void; onOpen: (id: string) => void }

export default function ProjectTeams({ teams, agents, initialTeamId, onClose, onCreate, onUpdate, onArchive, onOpen }: ProjectTeamsProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const initialTeam = teams.find(team => team.id === initialTeamId)
  const [editing, setEditing] = useState<string | null | undefined>(initialTeam?.id)
  const [title, setTitle] = useState(initialTeam?.title ?? '')
  const [members, setMembers] = useState<MascotAgent[]>(initialTeam?.members ?? [])
  const [archived, setArchived] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close() }, [])
  function edit(team?: ProjectTeam) { setEditing(team?.id ?? null); setTitle(team?.title ?? ''); setMembers(team?.members ?? []); setError('') }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setError('Dê um nome à equipe.'); return }
    if (members.length < 2) { setError('Escolha pelo menos dois participantes.'); return }
    if (editing) onUpdate(editing, { title: title.trim(), members })
    else onCreate(title.trim(), members)
    setEditing(undefined); setError('')
  }
  return <dialog ref={dialog} className="project-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="project-teams-title">
    <header><div><h2 id="project-teams-title">Equipes de projeto</h2><p>Um grupo e seu histórico para cada projeto.</p></div><button className="project-icon" onClick={onClose} aria-label="Fechar equipes"><X size={19} /></button></header>
    {editing !== undefined ? <form onSubmit={submit} className="project-team-form"><h3>{editing ? 'Editar equipe' : 'Nova equipe'}</h3><label>Nome da equipe<input autoFocus maxLength={80} value={title} onChange={event => setTitle(event.target.value)} placeholder="Nome do projeto" /></label><fieldset><legend>Participantes ({members.length})</legend><div className="project-agent-list">{agents.map(agent => <label key={agent.id}><input type="checkbox" checked={members.includes(agent.id)} onChange={event => setMembers(previous => event.target.checked ? [...previous, agent.id] : previous.filter(id => id !== agent.id))} /><span><strong>{agent.name}</strong><small>{agent.role}</small></span>{members.includes(agent.id) && <Check size={15} />}</label>)}</div></fieldset>{editing && <p className="project-note">As mensagens anteriores continuam no histórico ao mudar participantes.</p>}{error && <p role="alert" className="project-error">{error}</p>}<footer><button type="button" onClick={() => setEditing(undefined)}>Cancelar</button><button type="submit" className="project-primary">{editing ? 'Salvar alterações' : 'Criar equipe'}</button></footer></form> : <><div className="project-toolbar"><div className="project-filters"><button aria-pressed={!archived} onClick={() => setArchived(false)}>Ativas</button><button aria-pressed={archived} onClick={() => setArchived(true)}>Arquivadas</button></div><button className="project-primary" onClick={() => edit()}><Plus size={16} />Nova equipe</button></div><div className="project-team-list">{teams.filter(team => Boolean(team.archived) === archived).map(team => <article key={team.id}><button className="project-team-open" onClick={() => onOpen(team.id)}><Users size={20} /><span><strong>{team.title}</strong><small>{team.members.map(id => agents.find(agent => agent.id === id)?.name ?? id).join(', ')}</small></span></button><button className="project-icon" onClick={() => edit(team)} aria-label={`Editar ${team.title}`} title="Editar equipe"><Pencil size={16} /></button><button className="project-icon" onClick={() => onArchive(team.id, !team.archived)} aria-label={`${team.archived ? 'Restaurar' : 'Arquivar'} ${team.title}`} title={team.archived ? 'Restaurar equipe' : 'Arquivar equipe'}>{team.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}</button></article>)}{!teams.some(team => Boolean(team.archived) === archived) && <p className="project-empty">{archived ? 'Nenhuma equipe arquivada.' : 'Crie uma equipe para reunir os participantes do seu projeto.'}</p>}</div><p className="project-note">Arquivar preserva as mensagens e os arquivos. Você pode restaurar a equipe a qualquer momento.</p></>}
  </dialog>
}
