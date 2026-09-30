import { useLocalStore } from '../useLocalStore'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Clock3, Monitor, FileText, Plus, Play, Trash2, X } from 'lucide-react'
import Mascot, { type MascotAgent, type MascotState } from './Mascot'
import './WorkPanel.css'
import TaskDetails from './TaskDetails'
import { type ChatTask, type TaskStatus, type ChatMessage } from '../chatWork'

import { loadRoutines, routineStorageKey as storageKey, type Routine } from '../routines'
const states: { label: string; state: MascotState; activity: string }[] = [
  { label: 'Livre', state: 'idle', activity: 'Pronto para uma nova ideia' },
  { label: 'Trabalhando', state: 'writing', activity: 'Preparando um rascunho' },
  { label: 'Aguardando', state: 'waiting', activity: 'Aguardando sua resposta' },
  { label: 'Bloqueado', state: 'error', activity: 'Precisa de sua ajuda para continuar' },
  { label: 'Pensando', state: 'thinking', activity: 'Organizando as próximas etapas' },
  { label: 'Concluído', state: 'success', activity: 'Tudo pronto para você revisar' },
]
export default function WorkPanel({ chatId, agent, name, onClose, onNotice, tasks, openRequest, selectedTask, onSelectTask, onTaskStatus, agentName, files }: { chatId: string; agent: MascotAgent; name: string; onClose: () => void; onNotice: (text: string) => void; tasks: ChatTask[]; openRequest: number; selectedTask?: ChatTask; onSelectTask: (task: ChatTask) => void; onTaskStatus: (id: string, status: TaskStatus) => void; agentName: (id: MascotAgent) => string; files: NonNullable<ChatMessage['attachment']>[] }) {
  const [panelTab, setPanelTab] = useState<'task' | 'files' | 'computer'>('task')
  useEffect(() => { setPanelTab('task'); setEditor(null) }, [selectedTask?.id, chatId, openRequest])
  const [routines, setRoutines, storageError] = useLocalStore(storageKey, loadRoutines)
  const [editor, setEditor] = useState<Routine | null>(null)
  const [stateIndex, setStateIndex] = useState(0)
  useEffect(() => { setEditor(null) }, [chatId])
  const update = (next: Routine) => setRoutines(previous => [next, ...previous.filter(r => r.id !== next.id)])
  const save = (event: FormEvent) => { event.preventDefault(); if (!editor) return; const next = { ...editor, name: editor.name.trim(), instruction: editor.instruction.trim() }; if (!next.name || !next.instruction) return; update(next); onNotice(`Rotina “${next.name}” salva: ${next.frequency.toLowerCase()}, às ${next.time}. Configuração local; execução automática ainda não conectada.`); setEditor(null) }
  const patch = (value: Partial<Routine>) => setEditor(previous => previous ? { ...previous, ...value } : null)
  const test = () => { if (!editor) return; const next = { ...editor, runs: [Date.now(), ...editor.runs] }; update(next); setEditor(next); onNotice(`Teste demonstrativo de “${next.name}” concluído. Instrução: ${next.instruction.replace(/[.!?]+$/, '')}. Nenhuma ferramenta externa foi executada.`) }
  const activity = states[stateIndex]
  return <aside className="work-panel" aria-label="Painel de trabalho">
    <header><span><Monitor size={16} /> {editor ? 'Rotina' : `Espaço de ${name}`}</span><button className="icon-button" aria-label="Fechar painel de trabalho" onClick={onClose}><X size={17} /></button></header>
    {!editor && <div className="work-panel-tabs" role="tablist" aria-label="Detalhes do trabalho">{([{ id: 'task', label: 'Tarefa' }, { id: 'files', label: 'Arquivos' }, { id: 'computer', label: 'Computador' }] as const).map(tab => <button key={tab.id} role="tab" aria-selected={panelTab === tab.id} onClick={() => setPanelTab(tab.id)}>{tab.label}</button>)}</div>}
    <div className="work-panel-scroll">
    {editor ? <form className="routine-editor" onSubmit={save}>
      <button type="button" className="text-action" onClick={() => setEditor(null)}><ArrowLeft size={15} /> Todas as rotinas</button>
      <div className="routine-actions"><label><input aria-label="Rotina ativa" type="checkbox" checked={editor.active} onChange={e => patch({ active: e.target.checked })} /> {editor.active ? 'Ativa' : 'Pausada'}</label><button type="button" className="icon-button" aria-label="Excluir rotina" onClick={() => { setRoutines(previous => previous.filter(r => r.id !== editor.id)); setEditor(null) }}><Trash2 size={16} /></button></div>
      <label>Nome<input required maxLength={80} value={editor.name} onChange={e => patch({ name: e.target.value })} placeholder="Briefing da manhã" /></label>
      <label>Instrução<textarea required rows={5} value={editor.instruction} onChange={e => patch({ instruction: e.target.value })} placeholder="O que você quer acompanhar?" /></label>
      <fieldset><legend>Quando executar</legend><select aria-label="Frequência" value={editor.frequency} onChange={e => patch({ frequency: e.target.value })}><option>Todos os dias</option><option>Dias úteis</option><option>Toda segunda-feira</option></select><input aria-label="Horário" type="time" required value={editor.time} onChange={e => patch({ time: e.target.value })} /><small>Horário de Brasília</small></fieldset>
      <button className="primary-button" type="submit">Salvar rotina</button><button type="button" className="outline-button" disabled={!editor.name.trim() || !editor.instruction.trim()} onClick={test}><Play size={14} /> Testar demonstração</button>
      <h3>Histórico de testes</h3>{editor.runs.length ? <ul className="routine-history">{editor.runs.map((at, index) => <li key={`${at}-${index}`}>Teste local concluído<time>{new Date(at).toLocaleString('pt-BR')}</time></li>)}</ul> : <p className="work-muted">Ainda não há testes.</p>}
    </form> : <>
      {panelTab === 'task' && <TaskDetails task={selectedTask} tasks={tasks} agentName={agentName} onSelect={onSelectTask} onStatus={onTaskStatus} />}
      {panelTab === 'files' && <section className="work-files"><h3>Arquivos desta conversa</h3>{files.map((file,index) => <a key={index} href={file.data} download={file.name}><FileText size={18} /><span>{file.name}<small>{Math.ceil(file.size / 1024)} KB · anexo local</small></span></a>)}{tasks.filter(task => task.result).map(task => <a key={task.id} href={`data:text/markdown;charset=utf-8,${encodeURIComponent(task.result!)}`} download={`tarefa-${task.id}.md`}><FileText size={18} /><span>{task.title}<small>Rascunho demonstrativo · Markdown</small></span></a>)}{!files.length && !tasks.some(task => task.result) && <p className="work-muted">Anexos e rascunhos aparecerão aqui.</p>}<p className="work-muted">Arquivos guardados localmente. Não são enviados a nenhum serviço.</p></section>}
      {panelTab === 'computer' && <>
      <div className="machine-preview"><div className="machine-toolbar"><i /><i /><i /><span>Prévia de atividade</span></div><div className="machine-stage"><Mascot agent={agent} state={activity.state} size={118} /><span>{activity.activity}</span></div></div>
      <p className="work-muted machine-note">Máquina não conectada · estudo de interface</p>
      <div className="activity-states" aria-label="Estados do mascote">{states.map((item, index) => <button key={item.state} aria-pressed={stateIndex === index} onClick={() => setStateIndex(index)}>{item.label}</button>)}</div>
      <div className="computer-explanation"><strong>Computador indisponível</strong><p>Este painel é uma prévia visual. Nenhuma VM ou controle do seu computador está conectado.</p></div></>}
      {panelTab === 'task' && <>
      <div className="routines-heading"><h3><Clock3 size={16} /> Rotinas</h3><button className="icon-button" aria-label="Criar rotina" onClick={() => setEditor({ id: crypto.randomUUID(), chatId, name: '', instruction: '', frequency: 'Todos os dias', time: '09:00', active: true, runs: [] })}><Plus size={17} /></button></div>
      <div className="routine-list">{routines.filter(r => r.chatId === chatId).map(r => <button key={r.id} onClick={() => setEditor(r)}><Clock3 size={17} /><span><strong>{r.name}</strong><small>{r.frequency} · {r.time}</small></span><i className={r.active ? 'routine-active' : ''} title={r.active ? 'Ativa' : 'Pausada'} /></button>)}</div>
      {!routines.some(r => r.chatId === chatId) && <div className="routines-empty"><p>Um momento para cada ideia.</p><span>Organize lembretes e briefings desta conversa.</span><button className="text-action" onClick={() => setEditor({ id: crypto.randomUUID(), chatId, name: '', instruction: '', frequency: 'Todos os dias', time: '09:00', active: true, runs: [] })}>Criar primeira rotina <Plus size={14} /></button></div>}
    </>}
    </>}
    {(panelTab === 'task' || editor) && <p className="work-muted routine-demo">Rotinas demonstrativas. A execução automática será conectada depois.</p>}{storageError && <p role="alert">Não foi possível salvar as rotinas neste navegador.</p>}
    </div>
  </aside>
}
