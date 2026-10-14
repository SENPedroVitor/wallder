import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { frontendStore, mutateWorkspaceStore } from './frontend-store.mjs'

const key = 'wendler:frontend:v1'
const error = (message, status = 400) => Object.assign(new Error(message), { status })
const identifier = value => typeof value === 'string' && /^[\w-]{1,100}$/.test(value)
const allowedWidgets = new Set(['sports', 'shopping', 'pix', 'weather', 'focus', 'market', 'tasks', 'spending', 'canvas'])
const memoryHash = text => { let hash = 2166136261; for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619); return (hash >>> 0).toString(16) }

export function createMobileService({ dataDir, agents, startRun, status, timeoutMs = 360000 }) {
  const active = new Set()
  const pendingApprovals = new Map()
  const agentFor = id => {
    const agent = agents.find(agent => agent.id === (id === 'indiana' ? 'indy' : id))
    if (!agent) throw error('Agente desconhecido.')
    return agent
  }
  const read = async () => (await frontendStore({ method: 'GET' }, new URL('http://localhost/api/storage'), dataDir)).value.records
  const findChat = (workspace, agentId, conversationId) => {
    const chats = Array.isArray(workspace.chats) ? workspace.chats : []
    const candidates = chats.filter(chat => chat.agent === agentId && !chat.archived && !chat.private && !chat.projectId && !chat.members?.length)
    if (conversationId) {
      const chat = candidates.find(chat => chat.id === conversationId)
      if (!chat) throw error('Conversa alterada ou arquivada. Atualize antes de enviar.', 409)
      return chat
    }
    return candidates.sort((a, b) => b.updated - a.updated)[0]
  }
  const history = chat => chat ? { id: chat.id, agentId: chat.agent, messages: chat.messages.slice(-40).map(message => ({ id: message.id, sender: message.sender, text: message.text || '', at: message.at, ...(message.widget ? { hasWidget: true } : {}) })), busy: chat.messages.some(message => message.mobile?.status === 'running' && active.has(message.mobile.requestId)), approval: chat.messages.map(message => pendingApprovals.get(message.mobile?.requestId)).find(Boolean) || null } : { id: null, messages: [], busy: false }
  const mutate = apply => mutateWorkspaceStore(dataDir, (workspace, records) => { workspace.chats ??= []; return apply(workspace, records) })

  async function conversation(agentId) {
    const agent = agentFor(agentId), stores = await read(), workspace = stores[key]?.value || {}
    if (workspace.settings?.privacy?.saveHistory === false) throw error('Histórico desativado. Use uma conversa privada na interface web.', 403)
    return { agent: { id: agent.id, name: agent.name, role: agent.role }, ...history(findChat(workspace, agent.id)) }
  }
  async function chat(res, input) {
    const agent = agentFor(input?.agentId)
    if (!identifier(input?.requestId) || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 20000 || (input.conversationId != null && !identifier(input.conversationId))) throw error('Mensagem inválida.')
    if (!status().ready) throw error('O agente está temporariamente indisponível no servidor.', 503)
    const requestId = input.requestId
    if (active.has(requestId)) throw error('Esta mensagem ainda está em execução. Atualize a conversa.', 409)
    active.add(requestId)
    let saved
    try {
      saved = await mutate((workspace, records) => {
        if (workspace.settings?.privacy?.saveHistory === false) throw error('Histórico desativado. Use uma conversa privada na interface web.', 403)
        const all = workspace.chats.flatMap(chat => chat.messages || [])
        const duplicate = all.find(message => message.mobile?.requestId === requestId)
        if (duplicate) {
          const owner = workspace.chats.find(chat => chat.messages.some(message => message.id === duplicate.id))
          if (owner.agent !== agent.id || duplicate.text !== input.message.trim()) throw error('Identificador já utilizado para outra mensagem.', 409)
          const reply = owner.messages.find(message => message.id === 'android-reply-' + requestId)
          if (!reply) throw error('Mensagem já enviada. Confira a conversa; ela não será reenviada automaticamente.', 409)
          return { value: workspace, output: { duplicate: true, chat: owner, reply } }
        }
        let chat = findChat(workspace, agent.id, input.conversationId)
        if (!chat) {
          chat = { id: randomUUID(), title: input.message.trim().slice(0, 56), agent: agent.id, messages: [], updated: Date.now() }
          workspace.chats.unshift(chat)
          workspace.onboarded = true
          workspace.sidebarAgents = [...new Set([...(workspace.sidebarAgents || ['west', 'songbird', 'batman', 'pam']), agent.id])]
        }
        if (chat.messages.some(message => message.mobile?.status === 'running' && active.has(message.mobile.requestId))) throw error('Este agente já está respondendo nesta conversa.', 409)
        const user = { id: 'android-user-' + requestId, sender: 'you', text: input.message.trim(), at: Date.now(), mobile: { requestId, status: 'running' } }
        chat.messages.push(user); chat.updated = user.at
        return { value: workspace, output: { chat, workspace, records } }
      })
    } catch (cause) { active.delete(requestId); throw cause }
    if (saved.duplicate) {
      active.delete(requestId)
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ type: 'done', status: 'completed', text: saved.reply.text, conversationId: saved.chat.id }) + '\n')
      return
    }
    const { workspace, records } = saved
    const conversationId = saved.chat.id
    const send = event => { if (!res.destroyed && !res.writableEnded) res.write(JSON.stringify(event) + '\n') }
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
    send({ type: 'conversation', conversationId, agentId: agent.id })
    const privacy = { shareProfile: true, shareMemory: true, ...workspace.settings?.privacy }
    const permissions = { files: workspace.settings?.permissions?.files === true, computer: workspace.settings?.permissions?.computer === true }
    const preference = workspace.prefs?.[agent.id] || {}
    const memories = (records['waddle:records:v1']?.value || []).filter(record => record.kind === 'memoria' && !record.archived && [agent.id, 'Todos'].includes(record.fields?.Agente)).sort((a, b) => b.updated - a.updated).map(record => record.fields.Conteúdo || '')
    const memory = privacy.shareMemory ? [typeof preference.memory === 'string' ? preference.memory : '', ...memories].map(text => text.trim()).filter(Boolean).join('\n\n').slice(0, 8000) : ''
    const sharedContext = []
    if (privacy.shareProfile) sharedContext.push({ speaker: 'Perfil do usuário', text: [workspace.profile?.name, workspace.profile?.nickname, workspace.profile?.bio].filter(Boolean).join(' · ').slice(0, 8000) })
    if (privacy.shareMemory) sharedContext.push({ speaker: 'Memória autorizada deste agente', text: memory })
    let output = '', done, problem, widgetCount = 0, finishing = false
    const widgets = []
    const sink = new EventEmitter()
    sink.destroyed = false; sink.writableEnded = false; sink.status = 200
    sink.writeHead = code => { sink.status = code }
    sink.write = line => {
      if (finishing) return false
      const event = JSON.parse(line)
      if (sink.status >= 400) { problem = event.error; done = { status: 'failed' }; return true }
      if (event.type === 'done') { done = event; if (typeof event.text === 'string') output = event.text; return true }
      if (event.type === 'delta') output += event.text || ''
      if (event.type === 'approval') pendingApprovals.set(requestId, event)
      if (event.type === 'activity') pendingApprovals.delete(requestId)
      if (event.type === 'error') problem = event.message
      if (event.type === 'widget' && allowedWidgets.has(event.widget?.type)) widgets.push({ id: 'android-widget-' + requestId + '-' + widgetCount++, sender: agent.id, text: '', at: Date.now(), provider: 'codex', widget: event.widget })
      send(event); return true
    }
    const finish = async () => {
      if (finishing) return
      finishing = true; clearTimeout(timer); sink.writableEnded = true
      try {
        await mutate(workspace => {
          const chat = workspace.chats.find(chat => chat.id === conversationId)
          if (!chat) throw error('Conversa removida durante a resposta.', 409)
          const user = chat.messages.find(message => message.id === 'android-user-' + requestId)
          if (user) user.mobile.status = done?.status === 'completed' ? 'completed' : 'failed'
          for (const widget of widgets) if (!chat.messages.some(message => message.id === widget.id)) chat.messages.push(widget)
          if (done?.status === 'completed' && !chat.messages.some(message => message.id === 'android-reply-' + requestId)) chat.messages.push({ id: 'android-reply-' + requestId, sender: agent.id, text: output, at: Date.now(), provider: 'codex' })
          chat.updated = Date.now()
          return { value: workspace }
        })
        if (problem) send({ type: 'error', message: problem })
        send({ type: 'done', status: done?.status || 'failed', text: output, conversationId })
      } catch (cause) { send({ type: 'error', message: 'A resposta não foi sincronizada: ' + cause.message }); send({ type: 'done', status: 'failed', conversationId }) }
      finally { active.delete(requestId); pendingApprovals.delete(requestId); if (!res.writableEnded) res.end() }
    }
    sink.end = line => { if (line) sink.write(line); void finish() }
    const timer = setTimeout(() => { problem = 'Tempo limite atingido. Confira o histórico antes de repetir a operação.'; done = { status: 'failed' }; sink.destroyed = true; sink.emit('close'); void finish() }, timeoutMs)
    timer.unref?.()
    try {
      await startRun(null, sink, { requestId, conversationId, agent: { ...agent, tone: String(preference.tone || 'Claro'), humor: String(preference.humor || 'Equilibrado') }, message: input.message.trim(), context: saved.chat.messages.slice(-30).map(message => ({ speaker: message.sender === 'you' ? 'Você' : agents.find(agent => agent.id === message.sender)?.name || message.sender, text: (message.text || '').slice(0, 8000) })), sharedContext, permissions, contextEpoch: [workspace.contextEpoch, privacy.shareProfile, privacy.shareMemory, permissions.files, permissions.computer, memoryHash(memory)].join('-'), privateHistory: false, mode: 'chat' })
    } catch (cause) { problem = cause.message; done = { status: 'failed' }; await finish() }
  }
  return { conversation, chat, agents: () => agents.map(({ id, name, role }) => ({ id, name, role })) }
}
