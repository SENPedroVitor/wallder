import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, ListTodo, MessageCircle, Search, X } from 'lucide-react'
import { taskLabels, type ChatMessage, type ChatTask } from '../chatWork'
import './project-teams.css'

export type ConversationSearchResult = { kind: 'message' | 'file' | 'task'; id: string; messageId?: string; taskId?: string; title: string; text: string; at: number }
export type SearchConversationProps = { title: string; messages: ChatMessage[]; tasks: ChatTask[]; onClose: () => void; onSelect: (result: ConversationSearchResult) => void }
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export default function SearchConversation({ title, messages, tasks, onClose, onSelect }: SearchConversationProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | ConversationSearchResult['kind']>('all')
  useEffect(() => { const element = dialog.current; element?.showModal(); element?.querySelector('input')?.focus(); return () => element?.close() }, [])
  const results = useMemo(() => {
    const all: ConversationSearchResult[] = messages.flatMap(message => [
      ...(message.text ? [{ kind: 'message' as const, id: `message-${message.id}`, messageId: message.id, title: 'Mensagem', text: message.text, at: message.at }] : []),
      ...(message.attachment ? [{ kind: 'file' as const, id: `file-${message.id}`, messageId: message.id, title: message.attachment.name, text: message.text, at: message.at }] : []),
    ])
    tasks.forEach(task => {
      all.push({ kind: 'task', id: `task-${task.id}`, taskId: task.id, messageId: messages.find(message => message.taskId === task.id)?.id, title: task.title, text: `${taskLabels[task.status]} · ${task.instruction}`, at: task.created })
      if (task.result) all.push({ kind: 'file', id: `result-${task.id}`, taskId: task.id, messageId: messages.find(message => message.taskId === task.id)?.id, title: `${task.title}.md`, text: task.result, at: task.updated })
    })
    const terms = fold(query.trim()).split(/\s+/).filter(Boolean)
    return all.filter(result => (filter === 'all' || result.kind === filter) && terms.every(term => fold(`${result.title} ${result.text}`).includes(term))).sort((a, b) => b.at - a.at)
  }, [messages, tasks, query, filter])
  return <dialog ref={dialog} className="project-dialog search-conversation" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="conversation-search-title">
    <header><div><h2 id="conversation-search-title">Buscar na conversa</h2><p>{title}</p></div><button className="project-icon" onClick={onClose} aria-label="Fechar busca"><X size={19} /></button></header>
    <label className="project-search"><Search size={18} /><input aria-label="Buscar mensagens, arquivos e tarefas" autoFocus placeholder="Buscar mensagens, arquivos e tarefas" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="project-filters" aria-label="Tipo de resultado">{([['all', 'Tudo'], ['message', 'Mensagens'], ['file', 'Arquivos'], ['task', 'Tarefas']] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="project-search-results" aria-live="polite"><p className="project-count">{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</p>{results.map(result => <button key={result.id} className="project-search-result" onClick={() => onSelect(result)}>{result.kind === 'message' ? <MessageCircle size={18} /> : result.kind === 'file' ? <FileText size={18} /> : <ListTodo size={18} />}<span><strong>{result.title}</strong><small>{result.text.slice(0, 220) || 'Arquivo anexado nesta conversa.'}</small><time>{new Date(result.at).toLocaleString('pt-BR')}</time></span></button>)}{!results.length && <p className="project-empty">Nenhum resultado encontrado. Tente outro termo ou tipo.</p>}</div>
  </dialog>
}
