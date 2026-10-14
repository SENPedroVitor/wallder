import { useEffect, useId, useState } from 'react'
import { ArrowRight, ChevronDown, FileText, CircleCheck, Clock3, LoaderCircle, AlertCircle, Share2 } from 'lucide-react'
import Mascot, { type MascotAgent } from './Mascot'
import { taskLabels, type ChatTask, type ChatMessage } from '../chatWork'
import './chat-work.css'
import FormattedText from './FormattedText'
function MessageText({ text, highlighted }: { text: string; highlighted?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const copyId = useId()
  useEffect(() => { if (highlighted) setExpanded(true) }, [highlighted])
  const long = text.length > 1200 || text.split('\n').length > 22
  return <><div id={copyId} className={`message-copy${long && !expanded ? ' message-copy--collapsed' : ''}`}><FormattedText text={text} /></div>{long && <button className="message-expand" aria-controls={copyId} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Mostrar menos' : 'Ler mensagem completa'}<ChevronDown size={13} /></button>}</>
}
export default function ChatMessages({ messages, agents, tasks, onTask, accessory, highlightId, responding }: { responding?: boolean; highlightId?: string | null; messages: ChatMessage[]; agents: { id: MascotAgent; name: string }[]; tasks: ChatTask[]; onTask: (task: ChatTask) => void; accessory: (agent: MascotAgent) => boolean }) {
  const last = responding ? undefined : [...messages].reverse().find(message => message.sender !== 'you' && message.kind !== 'context')?.id
  const lastTaskMessage = new Map(messages.filter(message => message.taskId).map(message => [message.taskId, message.id]))
  const name = (sender: MascotAgent) => agents.find(agent => agent.id === sender)?.name ?? sender
  return <>{messages.map((message, index) => {
    const previous = messages[index - 1]
    const grouped = previous?.sender === message.sender && previous.kind !== 'context' && message.kind !== 'context' && message.at - previous.at < 300000
    const task = tasks.find(task => task.id === message.taskId)
    const StatusIcon = task?.status === 'done' ? CircleCheck : task?.status === 'blocked' ? AlertCircle : task?.status === 'running' ? LoaderCircle : Clock3
    if (message.kind === 'context' && message.transfer) return <details id={`message-${message.id}`} className={`context-transfer${highlightId === message.id ? ' search-highlight' : ''}`} key={message.id}><summary><Share2 size={13} /><span>{message.transfer.from} compartilhou contexto com {message.transfer.to.join(', ')}</span><small>{message.transfer.entries.length} mensagens</small><ChevronDown size={13} /></summary><div><p>Conteúdo compartilhado neste pedido:</p>{message.transfer.entries.map((entry, index) => <p key={index}><strong>{entry.speaker}</strong> {entry.text}</p>)}</div></details>
    return <div id={`message-${message.id}`} className={`message ${highlightId === message.id ? 'search-highlight ' : ''}${message.sender === 'you' ? 'user-message' : 'agent-message'}${grouped ? ' message--continuation' : ''}`} key={message.id}>
      {message.sender !== 'you' && <div className={message.id === last ? 'message-mascot' : 'message-avatar-spacer'} aria-hidden={message.id !== last || undefined}>{message.id === last && <Mascot animated agent={message.sender} state={task?.status === 'thinking' ? 'thinking' : task?.status === 'running' ? 'writing' : task?.status === 'blocked' ? 'blocked' : task?.status === 'waiting' ? 'waiting' : task?.status === 'done' ? 'success' : 'idle'} size={36} accessory={accessory(message.sender)} />}</div>}
      <div className="message-content">{!grouped && <div className="message-meta"><strong>{message.sender === 'you' ? 'Você' : name(message.sender)}</strong><time dateTime={new Date(message.at).toISOString()}>{new Date(message.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></div>}
      <div className={message.sender === 'you' ? 'message-bubble' : 'agent-message-text'}><MessageText text={message.text} highlighted={highlightId === message.id} />{message.attachment && <a className="chat-attachment" href={message.attachment.data} download={message.attachment.name}><FileText size={18} /><span>{message.attachment.name}<small>{Math.ceil(message.attachment.size / 1024)} KB · arquivo local</small></span></a>}</div>
      {task && lastTaskMessage.get(task.id) === message.id && <button className={`chat-task-card chat-task-card--${task.status}`} onClick={() => onTask(task)} aria-label={`Abrir tarefa: ${task.title}`}><StatusIcon size={15} /><span>{task.title}</span><small>{taskLabels[task.status]}</small><ArrowRight size={14} /></button>}
      {message.sender !== 'you' && !grouped && <span className="simulated-label">{message.provider === 'codex' ? 'Codex' : 'Demonstração local'}</span>}</div>
    </div>
  })}</>
}
