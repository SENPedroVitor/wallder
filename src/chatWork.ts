import type { MascotAgent } from './components/Mascot'
export type TaskStatus = 'thinking' | 'running' | 'waiting' | 'blocked' | 'done'
export type ContextEntry = { speaker: string; text: string }
export type ChatTask = { id: string; chatId: string; agent: MascotAgent; title: string; instruction: string; status: TaskStatus; created: number; updated: number; history: { status: TaskStatus; at: number }[]; context: ContextEntry[]; result?: string }
export type ChatMessage = { id: string; sender: MascotAgent | 'you'; text: string; at: number; kind?: 'handoff' | 'routine' | 'context'; attachment?: { name: string; size: number; data: string }; taskId?: string; transfer?: { from: string; to: string[]; entries: ContextEntry[] } }
export const taskLabels: Record<TaskStatus, string> = { thinking: 'Pensando', running: 'Em execução', waiting: 'Aguardando você', blocked: 'Bloqueada', done: 'Concluída' }
export const taskStorageKey = 'wendler:tasks:v1'
export function taskTitle(text: string): string {
  const sentence = text.replace(/@[\wÀ-ÿ-]+(?:\s+(?:Stark|Richards|Jordan|Rayner|Cooper|América))?/g, '').replace(/^[\s,.:]+/, '').split(/[.!?\n]/)[0].trim()
  const title = sentence || 'Organizar o arquivo enviado'
  const short = title.length > 64 ? `${title.slice(0,61).trimEnd()}…` : title
  return short.charAt(0).toLocaleUpperCase('pt-BR') + short.slice(1)
}
export function loadTasks(validAgents: string[]): ChatTask[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(taskStorageKey) || '[]'); return Array.isArray(value) ? value.filter((task): task is ChatTask => task && typeof task.id === 'string' && typeof task.chatId === 'string' && validAgents.includes(task.agent) && typeof task.title === 'string' && typeof task.instruction === 'string' && Object.hasOwn(taskLabels, task.status) && Array.isArray(task.history) && Array.isArray(task.context)).map(task => ({ ...task, title: taskTitle(task.title), context: task.context.filter(entry => typeof entry?.speaker === 'string' && typeof entry.text === 'string'), history: task.history.filter(entry => entry && Object.hasOwn(taskLabels, entry.status) && Number.isFinite(entry.at)), result: typeof task.result === 'string' ? task.result : undefined })) : [] } catch { return [] }
}
export function mentionedAgents<T extends { id: string; name: string }>(text: string, agents: T[]): T[] {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return agents.filter(agent => {
    const name = agent.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`@${name}(?=$|[\\s,.:;!?])`).test(normalized)
  })
}
export function transitionTask(task: ChatTask, status: TaskStatus, at = Date.now()): ChatTask {
  if (status === task.status) return task
  const excerpts = task.context.slice(-3).map(entry => `${entry.speaker}: ${entry.text.slice(0,320)}${entry.text.length > 320 ? '…' : ''}`).join('\n\n')
  const result = status === 'done' ? `# ${task.title}\n\nRascunho demonstrativo, preparado localmente.\n\n## Pedido\n${task.instruction}\n\n## Trechos de contexto\n${task.context.length} mensagens disponíveis. O contexto completo está nos detalhes da tarefa.\n\n${excerpts || 'Nenhuma mensagem anterior.'}\n\n## Próximo passo\nRevisar o pedido e conectar o motor de IA para produzir o resultado real.\n\nNenhuma ferramenta externa foi executada.` : task.result
  return { ...task, status, updated: at, result, history: [...task.history, { status, at }] }
}
