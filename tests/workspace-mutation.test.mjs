import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareWorkspaceMutation } from '../src/design/workspaceMutation.ts'

const base = () => ({ chats: [{ id: 'saved', messages: [], agent: 'west' }], selected: 'saved', settings: { privacy: { saveHistory: false } } })
test('back-to-back private creation and first message remain in memory through delayed commits', () => {
  const stored = base()
  const creation = prepareWorkspaceMutation(stored, d => ({ ...d, chats: [{ id: 'private', messages: [], agent: 'west', private: true }, ...d.chats], selected: 'private' }), new Set())
  const message = prepareWorkspaceMutation(creation.next, d => ({ ...d, chats: d.chats.map(c => c.id === 'private' ? { ...c, messages: [...c.messages, { text: 'Pedido privado' }] } : c) }), creation.privateIds)
  const firstCommit = creation.persist(stored)
  const secondCommit = message.persist(firstCommit)
  assert.equal(message.memory[0].messages[0].text, 'Pedido privado')
  assert.deepEqual(secondCommit.chats, stored.chats)
  assert.equal(secondCommit.selected, 'saved')
  assert.equal(stored.chats.length, 1)
  const enabled = prepareWorkspaceMutation(message.next, d => ({ ...d, settings: { privacy: { saveHistory: true } } }), message.privateIds)
  assert.equal(enabled.persist(secondCommit).chats.some(c => c.id === 'private'), false, 'enabling history cannot publish a private conversation')
})
test('persistent replay preserves concurrent remote chats and local selection stays out of storage', () => {
  const stored = { ...base(), settings: { privacy: { saveHistory: true } } }
  const plan = prepareWorkspaceMutation(stored, d => ({ ...d, selected: 'new', chats: [{ id: 'new', messages: [], agent: 'west' }, ...d.chats] }), new Set())
  const remote = { ...stored, selected: 'remote', chats: [...stored.chats, { id: 'remote', messages: [], agent: 'ted' }] }
  const persisted = plan.persist(remote)
  assert.deepEqual(persisted.chats.map(c => c.id), ['new', 'saved', 'remote'])
  assert.equal(persisted.selected, 'remote')
  assert.equal(plan.next.selected, 'new')
})
test('explicit private chats are excluded even while history is enabled', () => {
  const stored = { ...base(), settings: { privacy: { saveHistory: true } } }
  const plan = prepareWorkspaceMutation(stored, d => ({ ...d, chats: [...d.chats, { id: 'p', private: true, messages: [], agent: 'west' }] }), new Set())
  assert.equal(plan.memory.length, 1)
  assert.equal(plan.persist(stored).chats.length, 1)
})
