import { createId } from '../ids.ts'
import type { RecordEntry } from './workspace'

export const projectStates = ['todo', 'doing', 'review', 'done'] as const
export type ProjectState = typeof projectStates[number]
export type ProjectTask = { id: string; title: string; status: ProjectState; assignee: string; created: number; completed?: number }
export type ProjectAttachment = { id: string; name: string; size: number; data?: string; reference?: string }
export type ProjectDetails = { version: 1; description: string; notes: string; members: string[]; tasks: ProjectTask[]; attachments: ProjectAttachment[] }
export const projectFileLimit = 1_000_000
export const projectTotalLimit = 4_000_000
const field = 'wendler:project:v1'
export function readProject(project: RecordEntry): ProjectDetails {
  let saved: Partial<ProjectDetails> = {}
  try { saved = JSON.parse(project.fields[field] || '{}') || {} } catch { /* Keep legacy fields available. */ }
  return { version: 1, description: typeof saved.description === 'string' ? saved.description : project.fields.Descrição || '', notes: typeof saved.notes === 'string' ? saved.notes : '', members: [...new Set(Array.isArray(saved.members) ? saved.members.filter(v => typeof v === 'string') : (project.fields.members || project.fields.Agentes || '').split(',').map(v => v.trim()).filter(Boolean))], tasks: Array.isArray(saved.tasks) ? saved.tasks.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string' && projectStates.includes(t.status)) : [], attachments: Array.isArray(saved.attachments) ? saved.attachments.filter(a => a && typeof a.id === 'string' && typeof a.name === 'string' && Number.isFinite(a.size)) : [] }
}
export function writeProject(project: RecordEntry, details: ProjectDetails, at = Date.now()): RecordEntry {
  return { ...project, updated: at, fields: { ...project.fields, Descrição: details.description, members: details.members.join(','), Agentes: details.members.join(','), [field]: JSON.stringify(details) } }
}
export function addProjectTask(details: ProjectDetails, title: string, assignee = '', at = Date.now(), id = createId()): ProjectDetails {
  if (!title.trim()) throw new Error('Informe o título da tarefa.')
  return { ...details, tasks: [...details.tasks, { id, title: title.trim(), assignee, status: 'todo', created: at }] }
}
export function updateProjectTask(details: ProjectDetails, id: string, patch: Partial<Pick<ProjectTask, 'title' | 'assignee' | 'status'>>, at = Date.now()): ProjectDetails {
  if (patch.title !== undefined && !patch.title.trim()) throw new Error('Informe o título da tarefa.')
  if (patch.status !== undefined && !projectStates.includes(patch.status)) throw new Error('Estado inválido.')
  return { ...details, tasks: details.tasks.map(task => task.id !== id ? task : { ...task, ...patch, ...(patch.title === undefined ? {} : { title: patch.title.trim() }), completed: (patch.status ?? task.status) === 'done' ? task.completed ?? at : undefined }) }
}
export function removeProjectTask(details: ProjectDetails, id: string): ProjectDetails { return { ...details, tasks: details.tasks.filter(task => task.id !== id) } }
export function addProjectAttachment(details: ProjectDetails, attachment: ProjectAttachment): ProjectDetails {
  if (attachment.size < 0 || attachment.size > projectFileLimit || !Number.isFinite(attachment.size)) throw new Error('Cada arquivo pode ter até 1 MB.')
  if (details.attachments.reduce((sum, file) => sum + file.size, 0) + attachment.size > projectTotalLimit) throw new Error('Os anexos deste projeto podem ocupar até 4 MB.')
  if (!attachment.data && !attachment.reference) throw new Error('Informe um arquivo ou referência.')
  return { ...details, attachments: [...details.attachments, attachment] }
}
