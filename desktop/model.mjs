export function chooseTask(tasks, selectedId, dismissed = [], now = Date.now()) {
  const visible = tasks.filter(task => !dismissed.includes(task.id))
  return visible.find(task => task.approval) || visible.find(task => task.id === selectedId && task.status === 'running') || visible.find(task => task.status === 'running') || visible.find(task => task.pix && now - task.updatedAt < 5 * 60 * 1000) || visible.find(task => task.finishedAt && now - task.finishedAt < 20000) || null
}
export function islandState({ online, ready, task, expanded, showPix, showPc, activeCount }) {
  if (showPc) return 'pc'
  if (showPix && task?.pix) return 'pix-expanded'
  if (expanded) return 'expanded'
  if (!online || !ready) return 'offline'
  if (task?.approval) return 'approval'
  if (task?.pix) return 'pix'
  if (task?.status === 'running') return activeCount > 1 ? 'parallel' : 'working'
  if (task) return task.status === 'completed' ? 'completed' : 'failed'
  return 'idle'
}
export function elapsed(startedAt, now = Date.now()) { const seconds = Math.max(0, Math.floor((now - startedAt) / 1000)); return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') }
export function validateAction(input) {
  if (!input || typeof input !== 'object' || !['cancel', 'approval'].includes(input.type)) throw Error('Ação inválida.')
  if (typeof input.id !== 'string' || !/^[\w-]{1,100}$/.test(input.id)) throw Error('Identificador inválido.')
  if (input.type === 'approval' && !['accept', 'decline'].includes(input.decision)) throw Error('Decisão inválida.')
  return input.type === 'cancel' ? { path: '/api/cancel', body: { requestId: input.id } } : { path: '/api/approvals', body: { id: input.id, decision: input.decision } }
}
