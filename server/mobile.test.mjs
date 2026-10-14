import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { createMobileService } from './mobile.mjs'
import { mutateWorkspaceStore, mutateLocalStore } from './frontend-store.mjs'

const agents = [{ id: 'west', name: 'Ash', role: 'Orquestrador' }, { id: 'pam', name: 'Pam', role: 'Organização' }, { id: 'indy', name: 'Indiana Jones', role: 'Pesquisa' }]
const workspaceKey = 'wendler:frontend:v1'
function response() {
  const res = new EventEmitter(); res.destroyed = false; res.writableEnded = false; res.lines = []
  res.writeHead = status => { res.status = status }
  res.write = line => { res.lines.push(JSON.parse(line)) }
  res.done = new Promise(resolve => { res.end = line => { if (line) res.write(line); res.writableEnded = true; resolve(res.lines) } })
  return res
}
async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'wendler-mobile-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  const workspace = { chats: [{ id: 'web-chat', agent: 'pam', title: 'Conversa web', updated: 10, messages: [{ id: 'previous', sender: 'you', text: 'Contexto existente', at: 10 }] }], settings: { privacy: { shareMemory: true }, permissions: { files: true, computer: false } }, profile: { name: 'Teste' }, prefs: { pam: { memory: 'Memória da Pam' } } }
  await writeFile(path.join(dataDir, 'frontend.json'), JSON.stringify({ [workspaceKey]: { revision: 2, value: workspace }, 'waddle:records:v1': { revision: 1, value: [{ id: 'record', kind: 'nota' }] } }))
  const service = createMobileService({ dataDir, agents, status: () => ({ ready: true }), startRun: async (_req, res, input) => { res.writeHead(200); res.write(JSON.stringify({ type: 'done', status: 'completed', text: input.agent.name + ': resposta real do executor de teste' })); res.end() }, ...options })
  return { dataDir, service, read: async () => JSON.parse(await readFile(path.join(dataDir, 'frontend.json'), 'utf8')) }
}
test('Android reuses the correct web conversation, memory, permissions and sender', async t => {
  let received
  const f = await fixture(t, { startRun: async (_req, res, input) => { received = input; res.writeHead(200); res.write(JSON.stringify({ type: 'delta', text: 'Olá' })); res.write(JSON.stringify({ type: 'widget', widget: { type: 'tasks', data: { tasks: [] } } })); res.write(JSON.stringify({ type: 'done', status: 'completed', text: 'Resposta da Pam' })); res.end() } })
  const res = response(); await f.service.chat(res, { agentId: 'pam', requestId: 'mobile-1', message: 'Olá', conversationId: 'web-chat' }); const events = await res.done
  assert.equal(received.conversationId, 'web-chat'); assert.equal(received.agent.id, 'pam'); assert.equal(received.permissions.files, true)
  assert.ok(received.sharedContext.some(item => item.text === 'Memória da Pam')); assert.ok(received.context.some(item => item.text === 'Contexto existente'))
  const stores = await f.read(), chat = stores[workspaceKey].value.chats[0]
  assert.equal(chat.messages.at(-1).sender, 'pam'); assert.equal(chat.messages.at(-1).text, 'Resposta da Pam'); assert.equal(chat.messages.at(-2).widget.type, 'tasks')
  assert.equal(chat.messages.find(item => item.id === 'android-user-mobile-1').mobile.status, 'completed'); assert.equal(stores['waddle:records:v1'].value[0].id, 'record')
  assert.equal(events.at(-1).status, 'completed'); assert.equal((await f.service.conversation('pam')).messages.at(-1).text, 'Resposta da Pam')
})
test('repeated request IDs do not repeat tools or append duplicate messages', async t => {
  let count = 0
  const f = await fixture(t, { startRun: async (_req, res) => { count++; res.writeHead(200); res.write(JSON.stringify({ type: 'done', status: 'completed', text: 'Pronto' })); res.end() } })
  const input = { agentId: 'pam', requestId: 'same-operation', message: 'Organizar' }
  for (let i = 0; i < 2; i++) { const res = response(); await f.service.chat(res, input); await res.done }
  assert.equal(count, 1); assert.equal((await f.read())[workspaceKey].value.chats[0].messages.length, 3)
  await assert.rejects(f.service.chat(response(), { ...input, message: 'Outra tarefa' }), /outra mensagem/)
})
test('does not enter private, project or archived conversations; canonical aliases work', async t => {
  const f = await fixture(t)
  await mutateWorkspaceStore(f.dataDir, workspace => { workspace.chats.push({ id: 'private', agent: 'west', private: true, updated: 999, messages: [] }); return { value: workspace } })
  const res = response(); await f.service.chat(res, { agentId: 'west', requestId: 'new-west', message: 'Olá' }); await res.done
  const chats = (await f.read())[workspaceKey].value.chats
  assert.equal(chats.find(chat => chat.id === 'private').messages.length, 0); assert.equal(chats[0].agent, 'west')
  assert.equal((await f.service.conversation('indiana')).agent.id, 'indy')
  await assert.rejects(f.service.conversation('unknown'), /desconhecido/)
  await assert.rejects(f.service.chat(response(), { agentId: 'pam', conversationId: 'private', requestId: 'wrong-chat', message: 'Olá' }), /alterada ou arquivada/)
})
test('privacy disabled, server offline and invalid input never invoke a model', async t => {
  const f = await fixture(t, { startRun: () => assert.fail('must not start') })
  await mutateWorkspaceStore(f.dataDir, workspace => { workspace.settings.privacy.saveHistory = false; return { value: workspace } })
  await assert.rejects(f.service.chat(response(), { agentId: 'pam', requestId: 'private-1', message: 'Oi' }), /Histórico desativado/)
  await assert.rejects(f.service.conversation('pam'), /Histórico desativado/)
  const offline = createMobileService({ dataDir: f.dataDir, agents, status: () => ({ ready: false }), startRun: () => assert.fail() })
  await assert.rejects(offline.chat(response(), { agentId: 'pam', requestId: 'offline-1', message: 'Oi' }), /indisponível/)
})
test('failed or interrupted requests are not replayed after restart', async t => {
  const f = await fixture(t, { startRun: async (_req, res) => { res.writeHead(200); res.write(JSON.stringify({ type: 'error', message: 'Erro real' })); res.write(JSON.stringify({ type: 'done', status: 'failed' })); res.end() } })
  const input = { agentId: 'pam', requestId: 'failure-1', message: 'Oi' }, res = response()
  await f.service.chat(res, input); await res.done
  assert.equal((await f.read())[workspaceKey].value.chats[0].messages.at(-1).mobile.status, 'failed')
  const restarted = createMobileService({ dataDir: f.dataDir, agents, status: () => ({ ready: true }), startRun: () => assert.fail('no replay') })
  await assert.rejects(restarted.chat(response(), input), /já enviada/)
})
test('concurrent workspace and record changes preserve both revisions', async t => {
  const f = await fixture(t)
  await Promise.all([mutateWorkspaceStore(f.dataDir, workspace => { workspace.profile.name = 'Atualizado'; return { value: workspace } }), mutateLocalStore(f.dataDir, 'waddle:records:v1', records => { records.push({ id: 'new' }); return { value: records } })])
  const stores = await f.read(); assert.equal(stores[workspaceKey].value.profile.name, 'Atualizado'); assert.equal(stores['waddle:records:v1'].value.length, 2)
})
test('a disconnected phone keeps the result, exposes approvals, and blocks overlapping sends', async t => {
  let sink
  const f = await fixture(t, { startRun: async (_req, response) => { sink = response; response.writeHead(200); response.write(JSON.stringify({ type: 'approval', id: 'approval-test', title: 'Autorizar ação', details: { reason: 'Teste' } })) } })
  const res = response()
  await f.service.chat(res, { agentId: 'pam', requestId: 'background-1', message: 'Tarefa' })
  assert.equal((await f.service.conversation('pam')).busy, true)
  assert.equal((await f.service.conversation('pam')).approval.id, 'approval-test')
  await assert.rejects(f.service.chat(response(), { agentId: 'pam', requestId: 'overlap', message: 'Outra tarefa' }), /já está respondendo/)
  res.destroyed = true
  sink.write(JSON.stringify({ type: 'done', status: 'completed', text: 'Salvo mesmo sem o telefone conectado' })); sink.end()
  await res.done
  const history = await f.service.conversation('pam')
  assert.equal(history.busy, false); assert.equal(history.approval, null); assert.equal(history.messages.at(-1).text, 'Salvo mesmo sem o telefone conectado')
})
test('deadline interrupts an unfinished executor and leaves the message protected from replay', async t => {
  let interrupted = false
  const f = await fixture(t, { timeoutMs: 30, startRun: async (_req, sink) => { sink.writeHead(200); sink.on('close', () => { interrupted = true }) } })
  const res = response(), input = { agentId: 'pam', requestId: 'deadline-1', message: 'Tarefa lenta' }
  await f.service.chat(res, input)
  await new Promise(resolve => setTimeout(resolve, 60)); const events = await res.done
  assert.equal(interrupted, true); assert.equal(events.at(-1).status, 'failed')
  await assert.rejects(f.service.chat(response(), input), /já enviada/)
})
