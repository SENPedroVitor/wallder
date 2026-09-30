import { useEffect, useId, useRef, type FormEvent } from 'react'
import { ArrowUp, Maximize2, Minus, X } from 'lucide-react'
import Mascot, { type MascotAgent } from './Mascot'
import './mini-agent-chat.css'

import SharedContext, { type ContextMessage } from './SharedContext'
import type { MiniThread } from '../sharedThreads'

export default function MiniAgentChat({ agent, mainName, minimized, onMinimize, onClose, thread, mainMessages, onDraft, onSend, storageError, sharing, onToggleSharing }: {
  agent: { id: MascotAgent; name: string } | null
  mainName: string
  thread: MiniThread
  mainMessages: ContextMessage[]
  onDraft: (draft: string) => void
  onSend: () => void
  storageError: boolean
  sharing: boolean
  onToggleSharing: () => void
  minimized: boolean
  onMinimize: () => void
  onClose: () => void
}) {
  const input = useRef<HTMLTextAreaElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => { if (agent && !minimized) input.current?.focus() }, [agent?.id, minimized])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [agent?.id, thread.messages.length, minimized])
  if (!agent) return null
  function send(event?: FormEvent) { event?.preventDefault(); if (thread.draft.trim()) onSend() }
  return <section className={`mini-chat${minimized ? ' mini-chat--minimized' : ''}`} aria-labelledby={titleId}>
    <header><Mascot agent={agent.id} size={38} /><div><h2 id={titleId}>{agent.name}</h2><small>Em paralelo a {mainName}</small></div>
      <button onClick={onMinimize} aria-label={minimized ? 'Expandir mini chat' : 'Minimizar mini chat'}>{minimized ? <Maximize2 size={15} /> : <Minus size={17} />}</button>
      <button onClick={onClose} aria-label="Fechar mini chat"><X size={17} /></button>
    </header>
    {!minimized && <>
      <SharedContext name={mainName} messages={mainMessages} enabled={sharing} onToggle={onToggleSharing} />
      <div className="mini-chat__messages" role="log" aria-label={`Mensagens com ${agent.name}`}>
        {!thread.messages.length && <div className="mini-chat__empty"><Mascot agent={agent.id} size={85} /><h3>Uma consulta ao lado.</h3><p>Converse com {agent.name} sem sair do chat com {mainName}.</p></div>}
        {thread.messages.map((message, index) => <div key={index} className={`mini-chat__message mini-chat__message--${message.sender}`}><strong>{message.sender === 'you' ? 'Você' : agent.name}</strong><p>{message.text}</p>{message.sender === 'agent' && <small>Demonstração de interface</small>}</div>)}
        <div ref={end} />
      </div>
      <form onSubmit={send}><textarea ref={input} aria-label={`Mensagem no mini chat de ${agent.name}`} placeholder={`Pergunte a ${agent.name}…`} rows={2} value={thread.draft} onChange={event => onDraft(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() }
      }} /><div><small>Prévia local · sem IA conectada</small><button type="submit" disabled={!thread.draft.trim()} aria-label="Enviar no mini chat"><ArrowUp size={17} /></button></div></form>
      {storageError && <p className="mini-chat__storage" role="alert">Não foi possível salvar. O histórico continua nesta sessão.</p>}
    </>}
  </section>
}
