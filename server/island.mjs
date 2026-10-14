export function createIslandActivity({ now = Date.now } = {}) {
  const tasks = new Map()
  function observe(run, event) {
    if (!run?.requestId) return
    let task = tasks.get(run.requestId)
    if (!task) {
      task = { id: run.requestId, agentId: run.agentId, conversationId: run.conversationId, parentRequestId: run.parentRequestId, startedAt: run.requestedAt || now(), updatedAt: now(), status: 'running', activity: 'Preparando o agente…', private: run.privateHistory === true }
      tasks.set(task.id, task)
    }
    task.updatedAt = now()
    if (event.type === 'activity') { task.activity = String(event.text || 'Trabalhando…').slice(0, 300); task.phase = event.phase || 'working'; delete task.approval }
    if (event.type === 'delta') { task.phase = 'writing'; task.activity = 'Escrevendo a resposta…' }
    if (event.type === 'approval') { task.approval = { id: event.id, title: String(event.title || 'Autorizar ação').slice(0, 300), details: event.details }; task.phase = 'approval'; task.activity = 'Aguardando sua autorização' }
    if (event.type === 'error') task.error = String(event.message || 'Não foi possível concluir.').slice(0, 600)
    if (event.type === 'widget' && event.widget?.type === 'pix' && !task.private) {
      const data = event.widget.data
      if (typeof data?.image === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.image) && data.image.length < 1500000 && Number.isFinite(data.total) && data.total > 0) task.pix = { id: String(data.id || ''), item: String(data.item || 'Pedido Pix').slice(0, 160), total: data.total, ...(Number.isFinite(data.pix) ? { pix: data.pix } : {}), image: data.image, ...(typeof data.code === 'string' && /^000201/.test(data.code) && data.code.length < 1000 ? { code: data.code } : {}) }
    }
    if (event.type === 'done') { task.status = ['completed', 'failed', 'interrupted'].includes(event.status) ? event.status : 'failed'; task.finishedAt = now(); delete task.approval; task.activity = task.status === 'completed' ? 'Resposta concluída' : task.status === 'interrupted' ? 'Resposta interrompida' : task.error || 'Não foi possível concluir'; if (!task.private) task.summary = String(event.text || '').slice(0, 500) }
    for (const [id, value] of tasks) if (value.finishedAt && now() - value.finishedAt > 15 * 60 * 1000) tasks.delete(id)
    const finished = [...tasks.values()].filter(task => task.finishedAt).sort((a, b) => b.finishedAt - a.finishedAt)
    for (const task of finished.slice(24)) tasks.delete(task.id)
  }
  function snapshot({ agents, ready, approvals = new Map() }) {
    return { version: 1, serverTime: now(), ready, agents: agents.map(({ id, name, role }) => ({ id, name, role })), tasks: [...tasks.values()].map(task => {
      const result = { ...task, agentName: agents.find(agent => agent.id === task.agentId)?.name || task.agentId }
      // A decision may already have been made from another interface.
      if (result.approval && !approvals.has(result.approval.id)) delete result.approval
      if (result.private) { delete result.summary; delete result.pix; delete result.conversationId }
      return result
    }).sort((a, b) => b.startedAt - a.startedAt) }
  }
  return { observe, snapshot }
}
