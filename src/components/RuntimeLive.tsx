import Mascot, { type MascotAgent } from './Mascot'
import type { LiveRun } from '../runtime'
import { runVisual } from '../runVisual'
import './runtime.css'

function approvalDescription(details: unknown) {
  if (typeof details === 'string') return details
  if (details && typeof details === 'object' && 'command' in details && typeof details.command === 'string') {
    try {
      const action = JSON.parse(details.command)
      const window = 'reason' in details && typeof details.reason === 'string' ? `Janela: ${details.reason}\n` : ''
      if (action.action === 'press_key' && typeof action.key === 'string') return `${window}Pressionar a tecla ${action.key.replace(/^KP_/, '').replace(/Control_L/g, 'Ctrl').replace(/Shift_L/g, 'Shift').replace(/Alt_L/g, 'Alt')}.`
      if (action.action === 'type_text' && typeof action.text === 'string') return `${window}Digitar: ${action.text}`
      if (action.action === 'click') return `${window}Clicar ${Number.isInteger(action.element_index) ? `no elemento ${action.element_index}` : `na posição ${action.x}, ${action.y}`}.`
      if (action.action === 'scroll') return `${window}Rolar a janela (${action.scrollX ?? 0} na horizontal, ${action.scrollY ?? 0} na vertical).`
    } catch { /* Commands for file tasks remain visible in their original form. */ }
  }
  return JSON.stringify(details, null, 2)
}

export default function RuntimeLive({ run, name, onCancel, onApprove }: {
  run?: LiveRun; name: string; onCancel: () => void; onApprove: (decision: 'accept' | 'decline') => void
}) {
  if (!run) return null
  return <section className="runtime-live" aria-label={`Resposta em andamento de ${name}`}>
    <header><Mascot agent={run.agent as MascotAgent} state={runVisual(run).state} animated size={38} />
      <strong>{name}</strong><span role="status">{run.activity}</span><button onClick={onCancel}>Parar</button>
    </header>
    {run.text && <p>{run.text}</p>}
    {run.approval && <div className="runtime-approval"><strong>{run.approval.title}</strong>
      <pre>{approvalDescription(run.approval.details)}</pre>
      <button onClick={() => onApprove('accept')}>Autorizar esta ação</button><button onClick={() => onApprove('decline')}>Recusar</button>
    </div>}
  </section>
}
