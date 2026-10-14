import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { ComputerBridge } from './computer.mjs'

const allowedWindow = { id: 42, app: 'win32calc.exe', title: 'Calculadora' }
test('automatic navigation is temporary, window scoped and never approves clicks or typing',()=>{const bridge=new ComputerBridge({client:new EventEmitter()});bridge.window=allowedWindow;bridge.authorizeNavigation({mode:'session'});assert.equal(bridge.requiresConfirmation({action:'scroll'}),false);assert.equal(bridge.requiresConfirmation({action:'press_key',key:'Tab'}),false);for(const input of [{action:'click'},{action:'type_text',text:'test'},{action:'press_key',key:'Enter'},{action:'press_key',key:'Ctrl+L'}])assert.equal(bridge.requiresConfirmation(input),true);bridge.navigationGrant.expires=0;assert.equal(bridge.requiresConfirmation({action:'scroll'}),true);bridge.authorizeNavigation({mode:'session'});bridge.stop();assert.equal(bridge.navigationGrant,null);assert.equal(bridge.requiresConfirmation({action:'scroll'}),true)})
const result = value => ({ content: [{ type: 'text', text: `WENDLER_RESULT:${JSON.stringify(value)}` }] })

class FakeClient extends EventEmitter {
  constructor() { super(); this.calls = []; this.observed = false; this.blockFrame = null }
  async start() {}
  async request(method, params) {
    this.calls.push({ method, params })
    if (method === 'thread/start') return { thread: { id: 'fake-thread' } }
    if (method === 'mcpServerStatus/list') return { data: [{ name: 'node_repl', tools: { js: { inputSchema: { properties: { code: { type: 'string' } } } } } }] }
    assert.equal(method, 'mcpServer/tool/call')
    assert.equal(params.threadId, 'fake-thread')
    assert.equal(params.server, 'node_repl')
    assert.equal(params.tool, 'js')
    const code = params.arguments.code
    if (code.includes('const candidates =')) {
      if (code.includes('w.id === 999')) throw new Error('A janela selecionada não está mais disponível.')
      return result(allowedWindow)
    }
    if (code.includes('await sky.click') || code.includes('await sky.press_key') || code.includes('await sky.type_text') || code.includes('await sky.scroll')) {
      if (!this.observed) throw new Error('Observe a janela antes de agir.')
      return result({ window: allowedWindow, screenshots: [{ id: 'after-action', url: 'data:image/png;base64,AA==' }], accessibility: { focused_element: { role: 'text' } } })
    }
    if (code.includes('globalThis.wendlerPreview=')) {
      if (this.blockFrame) await this.blockFrame
      this.observed = true
      return result({ window: allowedWindow, screenshots: [{ id: 'fresh-frame', url: 'data:image/png;base64,AA==' }], accessibility: { focused_element: { role: 'text' } } })
    }
    if (code.includes('globalThis.wendlerApps')) return result([{ id: allowedWindow.app, windows: [allowedWindow] }])
    if (code.includes('WENDLER_RESULT:null')) return result(null)
    throw new Error(`Unexpected fake RPC: ${code}`)
  }
}

test('agent observations restore the selected window before capture; viewer polling never steals focus',async()=>{
  const client=new FakeClient(),bridge=new ComputerBridge({client})
  await bridge.select({window:allowedWindow})
  await bridge.frame(true)
  let code=client.calls.at(-1).params.arguments.code
  assert.ok(code.indexOf('await sky.activate_window')>=0)
  assert.ok(code.indexOf('await sky.activate_window')<code.indexOf('globalThis.wendlerPreview='))
  bridge.releaseObservation(bridge.generation)
  await bridge.frame(false)
  code=client.calls.at(-1).params.arguments.code
  assert.ok(!code.includes('await sky.activate_window'))
})

test('native permission is cached only for the approved app, risk and selected window generation', async () => {
  const client = new FakeClient()
  const replies = []
  client.respond = (id, value) => replies.push({ id, value })
  const bridge = new ComputerBridge({ client })
  await bridge.select({ window: allowedWindow })
  const request = (id, app = 'win32calc.exe', riskLevel = 'low') => ({ id, method: 'mcpServer/elicitation/request', params: { serverName: 'node_repl', mode: 'form', requestedSchema: { properties: {} }, _meta: { connector_id: 'computer-use', tool_params: { app }, riskLevel } } })
  client.emit('message', request(1))
  assert.equal(bridge.status().pendingApproval.id, '1')
  bridge.approve({ id: '1', decision: 'accept' })
  client.emit('message', request(2))
  assert.equal(bridge.status().pendingApproval, null)
  assert.equal(replies.at(-1).value._meta.persist, 'session')
  client.emit('message', request(3, 'win32calc.exe', 'high'))
  assert.equal(bridge.status().pendingApproval.id, '3')
  bridge.approve({ id: '3', decision: 'decline' })
  await bridge.select({ window: allowedWindow })
  client.emit('message', request(4))
  assert.equal(bridge.status().pendingApproval.id, '4')
  bridge.stop()
  assert.equal(replies.at(-1).value.action, 'cancel')
})

test('viewer captures resume after the current observation lease is released', async () => {
  const client = new FakeClient()
  const bridge = new ComputerBridge({ client })
  await bridge.select({ window: allowedWindow })
  await bridge.frame(true)
  const captures = () => client.calls.filter(call => call.params?.arguments?.code?.includes('globalThis.wendlerPreview=')).length
  const before = captures()
  await bridge.frame()
  assert.equal(captures(), before)
  bridge.releaseObservation(bridge.generation + 1)
  await bridge.frame()
  assert.equal(captures(), before)
  bridge.releaseObservation(bridge.generation)
  await bridge.frame()
  assert.equal(captures(), before + 1)
})

test('computer bridge binds a returned window and requires a fresh observation', async () => {
  const client = new FakeClient()
  const bridge = new ComputerBridge({ client, cwd: process.cwd() })
  const apps = await bridge.apps()
  assert.equal(apps.apps[0].windows[0].id, allowedWindow.id)
  await assert.rejects(bridge.select({ window: { ...allowedWindow, id: 999 } }), /não está mais disponível|Seleção/)
  await bridge.select({ window: allowedWindow })
  await assert.rejects(bridge.action({ action: 'click', x: 10, y: 20 }), /Observe a janela/)
  const observed = await bridge.frame(true)
  const acted = await bridge.action({ action: 'click', x: 10, y: 20, observationId: observed.observationId })
  assert.equal(acted.window.id, allowedWindow.id)
  assert.ok(client.calls.some(call => call.method === 'mcpServer/tool/call'))
  bridge.stop()
  await assert.rejects(bridge.action({ action: 'click', x: 10, y: 20 }), /Selecione uma janela/)
})

test('computer bridge rejects forbidden keys, invalid actions, and client JavaScript', async () => {
  const client = new FakeClient()
  const bridge = new ComputerBridge({ client })
  await bridge.select({ window: allowedWindow })
  const observed = await bridge.frame(true)
  await assert.rejects(bridge.action({ action: 'press_key', key: 'Win+R', observationId: observed.observationId }), /não permitido/)
  await assert.rejects(bridge.action({ action: 'press_key', key: 'Meta+R', observationId: observed.observationId }), /não permitido/)
  await assert.rejects(bridge.action({ action: 'press_key', key: 'Control_L+Escape', observationId: observed.observationId }), /fora da janela/)
  await assert.rejects(bridge.action({ action: 'press_key', key: 'Alt_L+Tab', observationId: observed.observationId }), /fora da janela/)
  await assert.rejects(bridge.action({ action: 'type_text', text: 'line one\nline two', observationId: observed.observationId }), /Texto inválido/)
  await assert.rejects(bridge.action({ action: 'execute', code: 'process.exit()', observationId: observed.observationId }), /Ação inválida/)
  assert.equal(client.calls.filter(call => call.method === 'mcpServer/tool/call' && call.params.arguments.code.includes('process.exit()')).length, 0)
})

test('computer bridge refuses terminal and system file manager windows', async () => {
  const bridge = new ComputerBridge({ client: new FakeClient() })
  await assert.rejects(bridge.select({ window: { id: 10, app: 'powershell.exe', title: 'PowerShell' } }), /não permite Computer Use/)
  await assert.rejects(bridge.select({ window: { id: 11, app: 'explorer.exe', title: 'Explorador de Arquivos' } }), /não permite Computer Use/)
})
