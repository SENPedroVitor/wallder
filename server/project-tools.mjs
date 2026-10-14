import { randomUUID } from 'node:crypto'
import { mutateLocalStore } from './frontend-store.mjs'

export const projectTools = [{ type: 'function', name: 'wendler_project', description: 'Create or update a real task in the CURRENT saved Wendler project, or save its notes. Call only for a user request to change their project. Creating a task records a plan; it does not execute that task or purchase anything. Use a stable operationId per intended creation; retries reuse it. Use task IDs returned by wendler_widget kind=tasks to update.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['create_task', 'update_task', 'save_notes'] }, operationId: { type: 'string' }, taskId: { type: 'string' }, title: { type: 'string', maxLength: 200 }, assignee: { type: 'string' }, status: { type: 'string', enum: ['todo', 'doing', 'review', 'done'] }, notes: { type: 'string', maxLength: 12000 } }, required: ['action'], additionalProperties: false } }]

export async function changeProject(dataDir, args, scope) {
  if (scope.privateHistory) throw new Error('Uma conversa privada não altera projetos salvos. Abra a conversa do projeto.')
  if (!['create_task', 'update_task', 'save_notes'].includes(args?.action)) throw new Error('Ação de projeto inválida.')
  if (args.status !== undefined && !['todo', 'doing', 'review', 'done'].includes(args.status)) throw new Error('Estado inválido.')
  if (args.title !== undefined && (typeof args.title !== 'string' || !args.title.trim() || args.title.length > 200)) throw new Error('Título inválido.')
  if (args.action === 'create_task' && (!args.title || !/^[\w-]{1,100}$/.test(args.operationId || ''))) throw new Error('Informe título e identificador da operação.')
  if (args.action === 'save_notes' && (typeof args.notes !== 'string' || args.notes.length > 12000)) throw new Error('Notas inválidas.')
  return mutateLocalStore(dataDir, 'waddle:records:v1', (records, stores) => {
    const chat = stores['wendler:frontend:v1']?.value?.chats?.find(item => item.id === scope.conversationId)
    const project = records.find(item => item.kind === 'projeto' && !item.archived && ((item.id === (scope.projectId || chat?.projectId) && (item.fields.chatId === scope.conversationId || chat?.projectId === item.id)) || item.fields.chatId === scope.conversationId))
    if (!project) throw new Error('Abra uma conversa vinculada a um projeto para alterar seu quadro.')
    const details = JSON.parse(project.fields['wendler:project:v1'] || '{}')
    const tasks = details.tasks ??= []
    if (args.assignee !== undefined && (typeof args.assignee !== 'string' || (args.assignee && !details.members?.includes(args.assignee)))) throw new Error('Escolha um responsável da equipe deste projeto.')
    let task
    if (args.action === 'create_task') {
      task = tasks.find(item => item.operationId === args.operationId)
      if (task && (task.title !== args.title.trim() || task.assignee !== (args.assignee || ''))) throw new Error('Identificador já usado para outra tarefa.')
      if (!task) { task = { id: randomUUID(), operationId: args.operationId, title: args.title.trim(), assignee: args.assignee || '', status: 'todo', created: Date.now() }; tasks.push(task) }
    } else if (args.action === 'update_task') {
      task = tasks.find(item => item.id === args.taskId)
      if (!task) throw new Error('Tarefa não encontrada neste projeto.')
      if (args.title !== undefined) task.title = args.title.trim()
      if (args.assignee !== undefined) task.assignee = args.assignee
      if (args.status !== undefined) { task.status = args.status; if (args.status === 'done') task.completed ??= Date.now(); else delete task.completed }
    } else details.notes = args.notes
    project.fields['wendler:project:v1'] = JSON.stringify(details)
    project.updated = Date.now()
    return { value: records, output: { saved: true, projectId: project.id, projectTitle: project.title, ...(task ? { task } : { notes: details.notes }), meaning: 'Alteração salva no projeto local; nenhuma ação externa executada.' } }
  })
}
