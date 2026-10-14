import { useEffect, useRef, useState } from 'react'
import { Monitor, RefreshCw, Maximize2, Square, X, Calculator } from 'lucide-react'
import { runtimeJson } from '../runtime'
import './ComputerPanel.css'

type ComputerWindow = { id: number; app: string; title: string }
type ComputerEvent = { id?: string; at?: string | number; timestamp?: string | number; type?: string; message?: string; text?: string; action?: string }
type Status = { commonAuthorized?:boolean;commonApps?:string[];connected: boolean; active: boolean; window: ComputerWindow | null; navigationSession?:{expires:number;remaining:number}|null; error?: string; events?: ComputerEvent[]; testAvailable?: boolean; pendingApproval?: { id: string; message: string } | null }
type Frame = { image: string | null; capturedAt: string | number | null; window: ComputerWindow | null; events?: ComputerEvent[] }
type App = { id: string; displayName: string; windows: ComputerWindow[] }
const initialStatus: Status = { connected: false, active: false, window: null }
const time = (value: string | number) => new Date(value).toLocaleTimeString('pt-BR')
const connectionError = (message: string) => message.includes('helper already has an active request')
  ? 'O serviço nativo está preso em outra solicitação. Encerre a sessão de Computer Use no Codex e atualize a conexão. Se continuar, reabra o Codex.'
  : message

export default function ComputerPanel({onPermissions,accessEnabled=true,steamOnly=false}:{onPermissions?:()=>void;accessEnabled?:boolean;steamOnly?:boolean}={}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [apps, setApps] = useState<App[]>([])
  const [frame, setFrame] = useState<Frame | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const mounted = useRef(false)
  const pending = useRef(false)
  const operation = useRef(false)
  const actionError = useRef('')
  const statusPending = useRef(false)
  const generation = useRef(0)
  const queuedRefresh = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const refresh = async (loadApps = false) => {
    if (!mounted.current) return
    if (pending.current) { if (loadApps) queuedRefresh.current = true; return }
    pending.current = true
    const current = generation.current
    const valid = () => mounted.current && current === generation.current
    try {
      const next = await runtimeJson<Status>('computer/status')
      if (!valid()) return
      setStatus(next); setError(actionError.current || next.error || '')
      if (loadApps) {
        const result = await runtimeJson<{ apps: App[] }>('computer/apps')
        if (!valid()) return
        setApps(result.apps)
      }
      if (next.active && next.connected) {
        const result = await runtimeJson<Frame>('computer/frame')
        if (valid()) setFrame(result)
      } else setFrame(null)
    } catch (failure) {
      if (valid()) { setStatus(initialStatus); setFrame(null); setError(failure instanceof Error ? failure.message : 'Não foi possível acessar o computador local.') }
    } finally {
      pending.current = false
      if (queuedRefresh.current && !operation.current && mounted.current) { queuedRefresh.current = false; void refresh(true) }
    }
  }
  useEffect(() => {
    mounted.current = true
    void refresh(true)
    const poll = async () => {
      if (statusPending.current || document.visibilityState !== 'visible') return
      statusPending.current = true
      const current = generation.current
      try {
        const next = await runtimeJson<Status>('computer/status')
        if (mounted.current && current === generation.current) { setStatus(next); if (next.error) setError(next.error) }
      } catch (failure) {
        if (mounted.current && current === generation.current) setError(failure instanceof Error ? failure.message : 'O serviço local não respondeu.')
      } finally { statusPending.current = false }
      if (mounted.current && !operation.current && !pending.current) void refresh()
    }
    const timer = window.setInterval(() => void poll(), 2000)
    const visible = () => { if (!operation.current && document.visibilityState === 'visible') void refresh(true) }
    document.addEventListener('visibilitychange', visible)
    return () => { mounted.current = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [])
  useEffect(() => {
    if (!expanded || !dialog.current) return
    const element = dialog.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    return () => { element.close(); previousFocus?.focus() }
  }, [expanded])
  const action = async (path: string, body: unknown) => {
    if (operation.current && path !== 'computer/stop') return
    operation.current = true
    generation.current += 1
    const current = generation.current
    setExpanded(false)
    setBusy(true); actionError.current=''; setError('')
    try {
      await runtimeJson(path, body)
      if (mounted.current && current === generation.current) { setFrame(null); if (path === 'computer/stop') setStatus(previous => ({ ...previous, active: false, pendingApproval: null })); queuedRefresh.current = true }
    } catch (failure) { if (mounted.current && current === generation.current) {actionError.current=failure instanceof Error ? failure.message : 'A ação não foi concluída.';setError(actionError.current)} }
    finally {
      if (current === generation.current) {
        operation.current = false
        if (mounted.current) { setBusy(false); if (!pending.current) { queuedRefresh.current = false; void refresh(true) } }
      }
    }
  }
  const approve = async (decision: 'accept' | 'decline') => {
    if (!status.pendingApproval || approvalBusy) return
    setApprovalBusy(true)
    try {
      await runtimeJson('computer/approval', { id: status.pendingApproval.id, decision })
      if (mounted.current) setStatus(previous => ({ ...previous, pendingApproval: null }))
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Não foi possível enviar a autorização.') }
    finally { if (mounted.current) setApprovalBusy(false) }
  }
  const windows = apps.flatMap(app => app.windows)
  const events = frame?.events || status.events || []
  const screenshot = frame?.image?.startsWith('data:image/') ? frame.image : null
  return <section className="computer-panel" aria-label="Computador local">
    <div className="computer-heading"><h2><Monitor size={16} /> Computador local</h2><button className="icon-button" aria-label="Atualizar janelas" disabled={busy} onClick={() => void refresh(true)}><RefreshCw size={15} /></button></div>
    <p className="computer-status" role="status">{error ? 'Conexão indisponível' : status.connected ? status.active ? 'Captura ativa' : 'Serviço disponível' : 'Computador desconectado'}</p>
    <label className="computer-window-label">Janela do aplicativo<select aria-label="Janela do aplicativo" value={status.window?.id ?? ''} disabled={busy || !status.connected} onChange={event => { const selected = windows.find(item => item.id === Number(event.target.value)); if (selected) void action('computer/select', { window: selected }) }}><option value="">Selecione uma janela</option>{apps.map(app => <optgroup key={app.id} label={app.displayName}>{app.windows.map(window => <option key={window.id} value={window.id}>{window.title || app.displayName}</option>)}</optgroup>)}</select></label>
    {status.connected && !windows.length && <p className="work-muted">Nenhuma janela disponível. Abra um aplicativo e atualize a lista.</p>}
    <div className="computer-capture">{screenshot ? <><img src={screenshot} alt={`Captura de ${frame?.window?.title || 'janela selecionada'}`} /><button className="computer-expand" aria-label="Ampliar captura" onClick={() => setExpanded(true)}><Maximize2 size={16} /></button></> : <div className="computer-empty"><Monitor size={28} /><p>{status.active ? 'Aguardando a primeira captura.' : 'Selecione uma janela para ver a captura real.'}</p></div>}</div>
    <p className="computer-capture-time">{frame?.capturedAt ? `Última captura às ${time(frame.capturedAt)}` : 'Sem captura disponível'}</p>
    <p className="work-muted">{steamOnly?'A Pam pode preparar o pedido na Steam pelo chat normal. O CPF protegido e as ações do checkout pedem sua autorização; ela para no QR Code para você pagar.':accessEnabled?'Para o agente trabalhar nesta janela, ative Criar tarefa no chat e envie seu pedido. As ações aparecem no chat para você autorizar.':'O acesso dos agentes ao computador está desativado nas suas preferências. Ative Computador nas permissões, selecione a janela e use Criar tarefa no chat.'}</p>
    {onPermissions&&!steamOnly&&<button className="outline-button" onClick={onPermissions}>Configurar permissões do agente</button>}
    {status.active&&<div className="computer-actions"><button className="outline-button" disabled={busy} onClick={()=>void action('computer/authorize-common',{mode:status.commonAuthorized?'manual':'common'})}>{status.commonAuthorized?'Revogar autorização salva deste aplicativo':'Autorizar tarefas comuns neste aplicativo'}</button><p className="work-muted">{status.commonAuthorized?'Autorização salva para a equipe. Cliques e digitação comuns podem ser executados sem nova pergunta. Compras, dados pessoais e ações sensíveis continuam com revisão.':'A autorização vale para este aplicativo e permanece após reiniciar o serviço.'}</p></div>}{status.active&&<fieldset className="browser-authorization"><legend>Nível de automação desta janela</legend><button className="outline-button" aria-pressed={!status.navigationSession} disabled={busy} onClick={()=>void action('computer/authorize-navigation',{mode:'manual'})}>Confirmar cada ação</button><button className="outline-button" aria-pressed={!!status.navigationSession} disabled={busy} onClick={()=>void action('computer/authorize-navigation',{mode:'session'})}>Navegação automática por 15 minutos</button><p className="work-muted">Rolagem e teclas de navegação podem ser automáticas nesta janela. Cliques e digitação continuam pedindo confirmação. Parar revoga a sessão.</p></fieldset>}
    <div className="computer-actions"><button className="outline-button" disabled={!busy && !status.active && !status.pendingApproval} onClick={() => void action('computer/stop', {})}><Square size={13} /> Parar</button>{status.testAvailable && <button className="outline-button" disabled={busy} onClick={() => void action('computer/test', {})}><Calculator size={14} /> Testar conexão</button>}</div>
    {status.pendingApproval && <section className="computer-approval" aria-label="Autorização do computador"><h3>Autorização necessária</h3><p>{status.pendingApproval.message}</p><div className="computer-actions"><button className="outline-button" disabled={approvalBusy} onClick={() => void approve('accept')}>Autorizar</button><button className="outline-button" disabled={approvalBusy} onClick={() => void approve('decline')}>Recusar</button></div></section>}
    {error && <p className="field-error" role="alert">{connectionError(error)}</p>}
    <h3>Atividade</h3>{events.length ? <ol className="computer-timeline">{events.slice(-20).reverse().map((event, index) => <li key={event.id || index}><span>{event.message || event.text || event.action || event.type || 'Ação registrada'}</span>{(event.at || event.timestamp) && <time>{time((event.at || event.timestamp)!)}</time>}</li>)}</ol> : <p className="work-muted">As ações do computador aparecerão aqui.</p>}
    {expanded && <dialog ref={dialog} className="computer-overlay" aria-label="Captura ampliada" onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)}><header><span>{frame?.window?.title || 'Computador local'}</span><button autoFocus className="icon-button" aria-label="Fechar captura ampliada" onClick={() => setExpanded(false)}><X size={20} /></button></header>{screenshot && <img src={screenshot} alt="Captura ampliada da janela selecionada" />}</dialog>}
  </section>
}
