import test from 'node:test'
import assert from 'node:assert/strict'
import { readProject, writeProject, addProjectTask, updateProjectTask, removeProjectTask, addProjectAttachment } from '../src/design/projects.ts'

test('project task lifecycle is immutable and serialization preserves existing fields', () => {
  const project = { id: 'p', kind: 'projeto', title: 'Projeto', updated: 1, fields: { chatId: 'team-chat', Agentes: 'batman,songbird', Outro: 'preservado' } }
  const original = readProject(project)
  assert.deepEqual(original.members, ['batman', 'songbird'])
  const added = addProjectTask(original, ' Primeira tarefa ', 'songbird', 10, 'task')
  assert.equal(original.tasks.length, 0)
  assert.equal(added.tasks[0].title, 'Primeira tarefa')
  const doing = updateProjectTask(added, 'task', { status: 'doing' }, 20)
  const reviewed=updateProjectTask(doing,'task',{status:'review'},25)
  assert.equal(readProject(writeProject(project,reviewed)).tasks[0].status,'review')
  const done = updateProjectTask(doing, 'task', { status: 'done' }, 30)
  assert.equal(done.tasks[0].completed, 30)
  assert.equal(doing.tasks[0].status, 'doing')
  const reopened = updateProjectTask(done, 'task', { status: 'todo', title: 'Revisar' }, 40)
  assert.equal(reopened.tasks[0].completed, undefined)
  const saved = writeProject(project, { ...reopened, notes: 'Decisão registrada' }, 50)
  assert.equal(saved.fields.chatId, 'team-chat')
  assert.equal(saved.fields.Outro, 'preservado')
  assert.equal(saved.updated, 50)
  assert.equal(readProject(saved).notes, 'Decisão registrada')
  assert.equal(removeProjectTask(readProject(saved), 'task').tasks.length, 0)
  assert.equal(project.updated, 1)
  assert.throws(() => addProjectTask(original, '  '), /título/)
})
test('project attachments enforce per-file and total limits without mutating the source', () => {
  const details = readProject({ fields: {} })
  const ref = addProjectAttachment(details, { id: 'ref', name: 'Arquivo', reference: 'C:/arquivo.txt', size: 0 })
  assert.equal(details.attachments.length, 0)
  assert.equal(ref.attachments[0].reference, 'C:/arquivo.txt')
  assert.throws(() => addProjectAttachment(ref, { id: 'big', name: 'Grande', size: 1000001, data: 'data:text/plain;base64,QQ==' }), /1 MB/)
  let full = details
  for (let i = 0; i < 4; i++) full = addProjectAttachment(full, { id: String(i), name: 'Arquivo', size: 1000000, data: 'data:text/plain;base64,QQ==' })
  assert.throws(() => addProjectAttachment(full, { id: 'extra', name: 'Extra', size: 1, data: 'data:text/plain;base64,QQ==' }), /4 MB/)
})
