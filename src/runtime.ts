import { useCallback, useEffect, useRef, useState } from 'react'
import type { ContextEntry } from './chatWork'
import { createId } from './ids.ts'
import { refreshStores } from './syncedStore.ts'

export type RuntimeStatus = { ready: boolean; authenticated: boolean; model: string; workspace: string; error?: string; remote?: boolean; online?: boolean }
export type RuntimeInput = {
  conversationId: string
  contextEpoch?: string
  privateHistory?: boolean
  projectId?: string
  permissions?: { files: boolean; computer: boolean }
  agent: { id: string; name: string; role: string; tone?: string; humor?: string }
  message: string
  context: ContextEntry[]
  sharedContext?: ContextEntry[]
  attachment?: { name: string; size: number; data: string }
  mode?: 'chat' | 'work'
}
export type LiveRun = { requestId: string; text: string; activity: string; agent: string; started: number; approval?: { id: string; title: string; details: unknown } }

export async function runtimeJson<T>(path: string, body?: unknown, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, body === undefined ? options : { ...options,
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || result.message || 'O serviço local não respondeu ao pedido.')
  return result as T
}

// Chunks may divide both UTF-8 characters and NDJSON records.
export async function readRuntimeStream(response: Response, event: (value: Record<string, unknown>) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || body.message || `Serviço local: HTTP ${response.status}`)
  }
  if (!response.body) throw new Error('O serviço local não iniciou a resposta.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const chunk = await reader.read()
      buffer += decoder.decode(chunk.value, { stream: !chunk.done })
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1)
        if (line) event(JSON.parse(line))
      }
      if (chunk.done) break
    }
    if (buffer.trim()) event(JSON.parse(buffer))
  } finally { reader.releaseLock() }
}

export function useRuntime() {
  const [status, setStatus] = useState<RuntimeStatus>({ ready: false, authenticated: false, model: '', workspace: '' })
  const [runs, setRuns] = useState<Record<string, LiveRun>>({})
  const controllers = useRef(new Map<string, AbortController>())
  const mounted = useRef(true)
  const refresh = useCallback(async () => {
    try { const next = await runtimeJson<RuntimeStatus>('status'); if (mounted.current) setStatus(next) }
    catch { if (mounted.current) setStatus(previous => ({ ...previous, ready: false, error: 'Serviço local desligado. Inicie o Wendler com npm start.' })) }
  }, [])
  useEffect(() => {
    mounted.current = true
    void refresh()
    const timer = window.setInterval(refresh, 15000)
    return () => { mounted.current = false; clearInterval(timer); for (const controller of controllers.current.values()) controller.abort() }
  }, [refresh])

  const start = async (scope: string, input: RuntimeInput, onWidget?: (widget: {type: string; data: unknown}) => void): Promise<string> => {
    if (controllers.current.has(scope)) throw new Error('Este agente já está respondendo nesta conversa.')
    const requestId = createId()
    const controller = new AbortController()
    controllers.current.set(scope, controller)
    const update = (patch: Partial<LiveRun>) => {
      if (mounted.current) setRuns(previous => ({ ...previous, [scope]: { ...previous[scope], ...patch } }))
    }
    setRuns(previous => ({ ...previous, [scope]: { requestId, text: '', activity: 'Preparando contexto…', agent: input.agent.id, started: Date.now() } }))
    let text = '', completed = false
    try {
      const bounded = (entries: ContextEntry[] = []) => entries.slice(-30).map(entry => ({ speaker: entry.speaker.slice(0, 100), text: entry.text.slice(0, 8000) }))
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, context: bounded(input.context), sharedContext: bounded(input.sharedContext), requestId }), signal: controller.signal })
      await readRuntimeStream(response, value => {
        if (value.type === 'widget' && value.widget && typeof value.widget === 'object') { const widget=value.widget as {type:string;data:unknown};if(['design','sports-list','sports','shopping','pix','focus','market','tasks','weather','canvas','spending'].includes(widget.type))onWidget?.(widget) }
        if (value.type === 'delta' && typeof value.text === 'string') { text += value.text; update({ text, activity: 'Escrevendo…' }) }
        if (value.type === 'activity') update({ activity: String(value.text || 'Trabalhando…') })
        if (value.type === 'approval') update({ activity: 'Aguardando sua autorização', approval: { id: String(value.id), title: String(value.title || 'Autorizar ação'), details: value.details } })
        if (value.type === 'error') throw new Error(String(value.message || 'O Codex não conseguiu responder.'))
        if (value.type === 'done') {
          if (value.status === 'interrupted') throw new Error('Resposta interrompida por você.')
          if (value.status === 'failed') throw new Error('O Codex não concluiu o pedido. Sua mensagem continua salva.')
          if (typeof value.text === 'string') text = value.text
          completed = true
        }
      })
      if (!completed) throw new Error('A conexão terminou antes de o Codex concluir. Sua mensagem continua salva.')
      // Project tools may have changed the board while the chat was streaming.
      await refreshStores().catch(() => {})
      return text
    } finally {
      controllers.current.delete(scope)
      if (mounted.current) setRuns(previous => { const next = { ...previous }; delete next[scope]; return next })
    }
  }
  const cancel = async (scope: string) => {
    const run = runs[scope]
    if (!run) return
    try { await runtimeJson('cancel', { requestId: run.requestId }) }
    catch { /* Closing the stream also asks the service to interrupt this turn. */ }
    finally { controllers.current.get(scope)?.abort() }
  }
  const approve = async (scope: string, decision: 'accept' | 'decline') => {
    const approval = runs[scope]?.approval
    if (!approval) return
    try {
      await runtimeJson('approvals', { id: approval.id, decision })
      setRuns(previous => previous[scope] ? ({ ...previous, [scope]: { ...previous[scope], approval: undefined, activity: decision === 'accept' ? 'Ação autorizada' : 'Ação recusada' } }) : previous)
    } catch (error) {
      setRuns(previous => previous[scope] ? ({ ...previous, [scope]: { ...previous[scope], activity: error instanceof Error ? error.message : 'Não foi possível enviar sua decisão. Tente novamente.' } }) : previous)
    }
  }
  return { status, runs, refresh, start, cancel, approve }
}
