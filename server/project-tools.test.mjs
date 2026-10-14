import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { changeProject } from './project-tools.mjs'
import { frontendStore } from './frontend-store.mjs'

test('agent changes persist, reject stale browser saves, deduplicate retries and isolate projects', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'wendler-project-tools-'))
  const project = id => ({ id, kind: 'projeto', title: id, fields: { chatId: 'chat-' + id, 'wendler:project:v1': JSON.stringify({ version: 1, notes: '', members: ['west','ted'], tasks: [], attachments: [] }) } })
  await writeFile(path.join(dir, 'frontend.json'), JSON.stringify({ 'waddle:records:v1': { revision: 1, value: [project('one'), project('two')] } }))
  const scope = { conversationId: 'chat-one', projectId: 'one' }
  const args = { action: 'create_task', title: 'Revisar resumo', assignee: 'ted', operationId: 'review-1' }
  const [first, retry] = await Promise.all([changeProject(dir, args, scope), changeProject(dir, args, scope)])
  assert.equal(first.task.id, retry.task.id)
  await assert.rejects(changeProject(dir, {...args, title:'Outra tarefa'}, scope), /outra tarefa/)
  const updated = await changeProject(dir, { action: 'update_task', taskId: first.task.id, status: 'done' }, scope)
  assert.equal(updated.task.status, 'done')
  assert.ok(updated.task.completed)
  const reviewed=await changeProject(dir,{action:'update_task',taskId:first.task.id,status:'review'},scope)
  assert.equal(reviewed.task.status,'review')
  assert.equal(reviewed.task.completed,undefined)
  await assert.rejects(changeProject(dir, { action: 'update_task', taskId: first.task.id, status: 'done' }, { conversationId: 'chat-two', projectId: 'two' }), /não encontrada/)
  await assert.rejects(changeProject(dir, args, { conversationId: 'unrelated', projectId: 'one' }), /vinculada/)
  await assert.rejects(changeProject(dir, args, {...scope, privateHistory:true}), /privada/)
  await assert.rejects(changeProject(dir, {...args, assignee:'outsider'}, scope), /equipe/)
  const saved = JSON.parse(await readFile(path.join(dir, 'frontend.json'), 'utf8'))
  const req = { method: 'POST', async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify({key:'waddle:records:v1', revision:1, value:[]})) } }
  assert.equal((await frontendStore(req, new URL('http://localhost/api/storage'), dir)).status, 409)
  assert.equal(JSON.parse(saved['waddle:records:v1'].value[0].fields['wendler:project:v1']).tasks.length, 1)
  assert.equal(JSON.parse(saved['waddle:records:v1'].value[1].fields['wendler:project:v1']).tasks.length, 0)
})
