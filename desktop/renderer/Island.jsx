import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, ChevronLeft, Clipboard, Cpu, LoaderCircle, Monitor, MonitorCog, Settings2, Square, WifiOff, X } from 'lucide-react'
import { chooseTask, elapsed, islandState } from '../model.mjs'
import { Mascot } from './Mascot'

const bridge = window.wendlerIsland || {
  snapshot: async () => { const response = await fetch('/api/island/status'); if (!response.ok) throw Error('Servidor indisponível'); return { ...await response.json(), online: true } },
  action: async input => { const response = await fetch(input.type === 'approval' ? '/api/approvals' : '/api/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input.type === 'approval' ? { id: input.id, decision: input.decision } : { requestId: input.id }) }); const result = await response.json(); if (!response.ok) throw Error(result.error); return result },
  pointer: () => {}, open: ({ type, conversationId } = {}) => window.open(type === 'browser' ? '/computer/' : conversationId ? '/?conversation=' + encodeURIComponent(conversationId) : '/', '_blank', 'noopener'),
  copyPix: async () => { throw Error('Copie o código pelo aplicativo Windows ou pelo painel.') }, hide: () => {}, onToggle: () => () => {},
}
const formatMoney = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function Bars() { return <span className="activity-bars" aria-label="Em atividade"><i/><i/><i/><i/></span> }
function Details({ details }) {
  if (details == null) return null
  if (typeof details !== 'object') return <p className="approval-details">{String(details)}</p>
  return <dl className="approval-details">{Object.entries(details).map(([key, value]) => <ReactFragment key={key} label={key} value={value} />)}</dl>
}
function ReactFragment({ label, value }) { return <div><dt>{label}</dt><dd>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')}</dd></div> }
export function Island() {
  const [snapshot, setSnapshot] = useState({ online: false, ready: false, tasks: [], agents: [] })
  const [expanded, setExpanded] = useState(false), [pinned, setPinned] = useState(false), [showPix, setShowPix] = useState(false), [showPc, setShowPc] = useState(false)
  const [selectedId, setSelectedId] = useState(null), [dismissed, setDismissed] = useState([]), [clock, setClock] = useState(Date.now()), [pending, setPending] = useState(false), [notice, setNotice] = useState('')
  const hoverTimer = useRef(), collapseTimer = useRef(), allowHover = useRef(0), inside = useRef(false)
  const surface = useRef(null), surfaceHeight = useRef(44), morph = useRef(null)
  const tasks = snapshot.tasks || [], running = tasks.filter(task => task.status === 'running'), task = chooseTask(tasks, selectedId, dismissed, clock)
  const state = islandState({ online: snapshot.online, ready: snapshot.ready, task, expanded, showPix, showPc, activeCount: running.length })
  const online = snapshot.online && snapshot.ready
  useLayoutEffect(() => {
    const node = surface.current
    if (!node) return
    morph.current?.cancel()
    const height = node.getBoundingClientRect().height, previous = surfaceHeight.current
    surfaceHeight.current = height
    if (previous !== height && !matchMedia('(prefers-reduced-motion: reduce)').matches) morph.current = node.animate([{ height: previous + 'px', minHeight: '0px' }, { height: height + 'px', minHeight: '0px' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' })
    return () => morph.current?.cancel()
  }, [state, task?.id, task?.approval?.id, notice])
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const update = () => { const bounds = node.getBoundingClientRect(); bridge.surface?.({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, radius: parseFloat(getComputedStyle(node).borderRadius) || 0 }) }
    const observer = new ResizeObserver(update); observer.observe(node); update()
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    let stopped = false, timer
    const poll = async () => {
      try { const result = await bridge.snapshot(); if (!stopped) { setSnapshot(result); setClock(Date.now()) } }
      catch { if (!stopped) setSnapshot(previous => ({ ...previous, online: false })) }
      if (!stopped) timer = setTimeout(poll, 1000)
    }
    void poll()
    const pointer = event => { const next = !!event.target?.closest?.('.island'); if (inside.current !== next) { inside.current = next; bridge.pointer(next) } }
    const leave = () => { inside.current = false; bridge.pointer(false) }
    window.addEventListener('pointermove', pointer); window.addEventListener('blur', leave); document.addEventListener('mouseleave', leave)
    const untoggle = bridge.onToggle(() => { setExpanded(value => !value); setPinned(value => !value); setShowPc(false); setShowPix(false) })
    return () => { stopped = true; clearTimeout(timer); clearTimeout(hoverTimer.current); clearTimeout(collapseTimer.current); window.removeEventListener('pointermove', pointer); window.removeEventListener('blur', leave); document.removeEventListener('mouseleave', leave); untoggle(); bridge.pointer(false) }
  }, [])
  const open = () => { setExpanded(true); setPinned(true) }
  const collapse = () => { setExpanded(false); setPinned(false); setShowPc(false); setShowPix(false); allowHover.current = Date.now() + 1000 }
  const enter = () => { clearTimeout(collapseTimer.current); clearTimeout(hoverTimer.current); bridge.pointer(true); inside.current = true; if (Date.now() > allowHover.current) hoverTimer.current = setTimeout(() => setExpanded(true), 600) }
  const leave = () => { clearTimeout(hoverTimer.current); if (!pinned && !showPix && !showPc) collapseTimer.current = setTimeout(() => setExpanded(false), 450) }
  const action = async input => {
    if (pending || !online) return
    setPending(true); setNotice('')
    try { await bridge.action(input); setNotice(input.type === 'approval' ? input.decision === 'accept' ? 'Autorização enviada' : 'Recusa enviada' : 'Interrupção solicitada') }
    catch (error) { setNotice(error.message || 'Não foi possível concluir a ação.') }
    finally { setPending(false) }
  }
  const dismiss = () => { if (task) setDismissed(value => [...value, task.id].slice(-100)); collapse() }
  const openTask = () => bridge.open({ conversationId: task?.conversationId })
  const agentName = task?.agentName || 'Wendler'
  const review = task?.approval
  const openQr = () => { setShowPix(true); setPinned(true); setExpanded(false) }
  const recent = tasks.filter(item => item.status !== 'running').slice(0, 4)
  const statusLabel = !snapshot.online ? 'Sem conexão com o servidor' : !snapshot.ready ? 'Agentes indisponíveis' : 'Equipe conectada'
  return <div className="island-host">
    {!window.wendlerIsland && <div className="browser-label">Prévia no navegador · janela Windows disponível pelo aplicativo</div>}
    <section ref={surface} className={'island island--' + state} data-state={state} aria-label="Ilha dos agentes Wendler" onPointerEnter={enter} onPointerLeave={leave} onKeyDown={event => { if (event.key === 'Escape') collapse() }}>
      {['idle', 'offline'].includes(state) && <button className="compact-trigger idle-trigger" onClick={open} aria-label="Expandir ilha"><Mascot id="west" size={30}/><span>{online ? 'Equipe conectada' : snapshot.online ? 'Agente indisponível' : 'Sem conexão'}</span>{online ? <span className="status-dot"/> : <WifiOff size={14}/>}</button>}
      {state === 'working' && <div className="compact-working"><button className="compact-trigger working-trigger" onClick={open}><Mascot id={task.agentId} name={agentName} size={50} active/><span className="task-heading"><strong>{agentName}</strong><small>{task.activity}</small></span><span className="elapsed">{elapsed(task.startedAt, clock)}</span></button><button className="circle-button interrupt-button" onClick={() => action({ type: 'cancel', id: task.id })} disabled={pending} aria-label="Interromper resposta"><Square size={14}/></button></div>}
      {state === 'parallel' && <button className="compact-trigger parallel-trigger" onClick={open}><span className="avatar-stack">{running.slice(0, 3).map(item => <Mascot key={item.id} id={item.agentId} name={item.agentName} size={36} active/>)}</span><span>{running.length} trabalhando</span><Bars/></button>}
      {state === 'approval' && <div className="compact-alert"><button className="compact-trigger alert-trigger" onClick={open}><Mascot id={task.agentId} name={agentName} size={44}/><span className="task-heading"><strong>{review.title}</strong><small className="accent">Aguardando sua autorização</small></span></button><button className="pill" disabled={pending || !online} onClick={() => action({ type: 'approval', id: review.id, decision: 'decline' })}>Recusar</button><button className="pill primary" onClick={open}>Revisar</button></div>}
      {['completed', 'failed'].includes(state) && <div className="compact-completed"><button className="compact-trigger complete-trigger" onClick={open}><Mascot id={task.agentId} name={agentName} size={44}/><span className="task-heading"><strong>{agentName} · {state === 'completed' ? 'resposta pronta' : 'resposta interrompida'}</strong><small>{task.activity}</small></span><span className="done-icon">{state === 'completed' ? <Check size={20}/> : <X size={18}/>}</span></button><button className="dismiss-complete" onClick={dismiss} aria-label="Dispensar aviso"><X size={12}/></button></div>}
      {state === 'pix' && <div className="compact-pix"><Mascot id={task.agentId} name={agentName} size={46}/><span className="task-heading"><strong>{agentName} · Pix disponível</strong><small>{task.pix.item} · {formatMoney(task.pix.pix ?? task.pix.total)}</small></span><button className="pill" onClick={dismiss}>Depois</button><button className="pill primary" onClick={openQr}>Ver QR</button></div>}
      {state === 'expanded' && <div className="expanded-content">
        <header className="island-header"><div className="agent-strip" aria-label="Tarefas ativas">{(running.length ? running : snapshot.agents.filter(agent => ['west','batman','songbird','hal'].includes(agent.id)).map(agent => ({ id: agent.id, agentId: agent.id, agentName: agent.name, idle: true }))).map(item => <button key={item.id} className={task?.id === item.id ? 'agent-button selected' : 'agent-button'} onClick={() => { if (!item.idle) setSelectedId(item.id) }} aria-label={item.agentName + (item.idle ? ' · disponível' : ' · ver tarefa')}><Mascot id={item.agentId} name={item.agentName} size={38} active={!item.idle}/><i className={'agent-status' + (item.idle ? ' agent-status--idle' : '')}/></button>)}</div><button className="text-link open-waddle" onClick={() => bridge.open({})}>Abrir Waddle <ArrowUpRight size={15}/></button><button className="icon-button" onClick={collapse} aria-label="Recolher ilha"><X size={16}/></button></header>
        {task ? <article className={'task-card' + (review ? ' task-card--approval' : '')}>
          <div className="task-card-heading"><Mascot id={task.agentId} name={agentName} size={44} active={task.status === 'running'}/><div><strong>{agentName} · {review ? 'precisa da sua decisão' : task.activity}</strong><p>{review ? review.title : task.status === 'running' ? 'Em andamento · ' + elapsed(task.startedAt, clock) : task.status === 'completed' ? 'Resposta disponível na conversa' : 'Confira o resultado antes de repetir'}</p></div>{task.status === 'running' && !review && <LoaderCircle className="spinner" size={18}/>}</div>
          {review && <Details details={review.details}/>}
          {!review && task.status === 'running' && <div className="progress-track" role="progressbar" aria-label="Agente trabalhando" aria-valuetext="Progresso não informado pelo executor"><i/></div>}
          {!review && task.status !== 'running' && task.summary && <p className="task-summary">{task.summary}</p>}
          <div className="task-actions">{review ? <><button className="pill" disabled={pending || !online} onClick={() => action({ type: 'approval', id: review.id, decision: 'decline' })}>Recusar</button><button className="pill primary" disabled={pending || !online} onClick={() => action({ type: 'approval', id: review.id, decision: 'accept' })}>{pending ? 'Enviando…' : 'Autorizar'}</button></> : <>{task.status === 'running' && <button className="pill" disabled={pending || !online} onClick={() => action({ type: 'cancel', id: task.id })}>{pending ? 'Interrompendo…' : 'Interromper'}</button>}<button className="pill white" onClick={openTask}>{task.status === 'running' ? 'Ver conversa' : 'Ver resposta'}</button><button className="pill" onClick={() => bridge.open({ type: 'browser' })}><Monitor size={13}/> Ver tela</button>{task.pix && <button className="pill primary" onClick={openQr}>Ver QR</button>}</>}</div>
        </article> : <article className="empty-card"><Mascot id="west" size={44}/><div><strong>{statusLabel}</strong><p>{online ? 'As próximas atividades aparecem aqui.' : 'Confira a conexão do Tailscale. A ilha tenta reconectar automaticamente.'}</p></div></article>}
        {!task && recent.length > 0 && <div className="recent-tasks">{recent.map(item => <button key={item.id} onClick={() => { setDismissed(value => value.filter(id => id !== item.id)); setSelectedId(item.id); bridge.open({ conversationId: item.conversationId }) }}><Mascot id={item.agentId} size={24}/><span>{item.agentName} · {item.activity}</span><ArrowUpRight size={13}/></button>)}</div>}
        <footer className="island-footer"><span><i className={'connection-dot' + (online ? ' connected' : '')}/>{online ? 'Servidor conectado' : 'Servidor desconectado'}</span><button onClick={() => { setShowPc(true); setPinned(true) }}><MonitorCog size={13}/> Este PC</button><button onClick={() => bridge.hide()} title="Reabrir pela bandeja do Windows ou Ctrl+Alt+Espaço"><Settings2 size={13}/> Ocultar</button></footer>
      </div>}
      {state === 'pix-expanded' && <div className="pix-content"><header className="island-header"><Mascot id={task.agentId} name={agentName} size={42}/><div className="task-heading"><strong>{agentName} · Pagar com Pix</strong><small>{task.pix.item}</small></div><button className="icon-button" onClick={() => { setShowPix(false); setExpanded(true) }} aria-label="Voltar"><ChevronLeft size={16}/></button></header><div className="pix-body"><img src={task.pix.image} width={160} height={160} alt="QR Pix retornado pelo processador da loja"/><div><span className="pix-label">Valor do Pix</span><strong className="pix-total">{formatMoney(task.pix.pix ?? task.pix.total)}</strong><p>Confira os dados no banco. A validade é definida pela loja; exibir o QR não confirma pagamento.</p>{task.pix.code && <button className="pill primary" disabled={!online || clock - task.updatedAt > 5 * 60 * 1000} onClick={async () => { try { await bridge.copyPix(task.id); setNotice('Código Pix copiado') } catch (error) { setNotice(error.message) } }}><Clipboard size={14}/> Copiar código</button>}<button className="text-link" onClick={openTask}>Abrir no painel <ArrowUpRight size={13}/></button></div></div></div>}
      {state === 'pc' && <div className="pc-content"><header className="island-header"><Mascot id="homer" name="Homer" size={42}/><div className="task-heading"><strong>Este computador</strong><small>Leitura local · {snapshot.pc?.host || 'disponível no Windows'}</small></div><button className="icon-button" onClick={() => { setShowPc(false); setExpanded(true) }} aria-label="Voltar"><ChevronLeft size={16}/></button></header><div className="pc-metrics"><div><Cpu size={18}/><span>CPU</span><strong>{snapshot.pc ? snapshot.pc.cpuPercent + '%' : 'Indisponível'}</strong></div><div><Monitor size={18}/><span>Memória</span><strong>{snapshot.pc ? Math.round(snapshot.pc.memoryUsed / snapshot.pc.memoryTotal * 100) + '%' : 'Indisponível'}</strong></div><div><ArrowUpRight size={18}/><span>Servidor</span><strong>{snapshot.online && snapshot.latency != null ? snapshot.latency + ' ms' : 'Sem conexão'}</strong></div></div><p className="pc-caption">CPU e memória são deste Windows. Temperatura, GPU e otimizações automáticas ainda não estão conectadas.</p><div className="task-actions"><button className="pill white" onClick={() => bridge.open({})}>Abrir Waddle</button><button className="pill" onClick={() => bridge.open({ type: 'browser' })}>Ver computador do servidor</button></div></div>}
      {notice && <div className="island-notice" role="status">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={12}/></button></div>}
    </section>
  </div>
}
