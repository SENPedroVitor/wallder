import { useId, useRef, useState, type KeyboardEvent } from 'react'
import Mascot, { type MascotAgent } from './Mascot'
export default function MentionComposer({ agents, value, onChange, onSend, placeholder }: { agents: { id: MascotAgent; name: string; role: string }[]; value: string; onChange: (text: string) => void; onSend: () => void; placeholder: string }) {
  const [cursor, setCursor] = useState(value.length)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const input = useRef<HTMLTextAreaElement>(null)
  const prefix = value.slice(0, cursor)
  const match = prefix.match(/(?:^|\s)@([^@\n,]*)$/)
  const query = match?.[1].toLocaleLowerCase('pt-BR') ?? ''
  const choices = match && !dismissed ? agents.filter(agent => agent.name.toLocaleLowerCase('pt-BR').startsWith(query)).slice(0, 20) : []
  const pick = (agent: typeof agents[number]) => { const start = prefix.lastIndexOf('@'); const position = start + agent.name.length + 2; const next = `${value.slice(0, start)}@${agent.name} ${value.slice(cursor)}`; onChange(next); setCursor(position); setDismissed(true); setActive(0); requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(position, position) }) }
  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (choices.length && ['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(event.key)) { event.preventDefault(); if (event.key === 'Escape') setDismissed(true); else if (event.key === 'ArrowDown') setActive(index => (index + 1) % choices.length); else if (event.key === 'ArrowUp') setActive(index => (index + choices.length - 1) % choices.length); else pick(choices[Math.min(active, choices.length - 1)]); return }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend() }
  }
  return <div className="mention-composer">{choices.length > 0 && <div className="mention-options" role="listbox" id={listId} aria-label="Mencionar agente">{choices.map((agent,index) => <button type="button" role="option" id={`${listId}-${index}`} aria-selected={index === active} key={agent.id} onMouseDown={event => event.preventDefault()} onClick={() => pick(agent)}><Mascot agent={agent.id} size={29} /><span><strong>{agent.name}</strong><small>{agent.role}</small></span></button>)}</div>}<textarea ref={input} aria-label="Sua mensagem" rows={1} aria-autocomplete="list" aria-controls={choices.length ? listId : undefined} aria-activedescendant={choices.length ? `${listId}-${Math.min(active,choices.length-1)}` : undefined} placeholder={placeholder} value={value} onChange={event => { onChange(event.target.value); setCursor(event.target.selectionStart); setDismissed(false); setActive(0) }} onSelect={event => setCursor(event.currentTarget.selectionStart)} onKeyDown={key} /></div>
}
