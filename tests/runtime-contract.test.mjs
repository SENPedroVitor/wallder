import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const fakeServer = `
const readline = require('node:readline')
let nextTurn = 1
let nextThread = 1
const pending = new Map()
function send(value) { process.stdout.write(JSON.stringify(value) + '\\n') }
function completed(threadId, turnId, status = 'completed') {
  send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status, items: [{ type: 'agentMessage', text: 'Resposta simulada do protocolo.' }] } } })
}
readline.createInterface({ input: process.stdin }).on('line', line => {
  const msg = JSON.parse(line)
  if (!msg.method && msg.id===903) { if(!msg.result?.success || !msg.result.contentItems?.[0]?.text.includes('delivered'))throw new Error('Team tool did not deliver');const turn=pending.get('team');completed(turn.threadId,turn.turnId);return }
  if (!msg.method && msg.id===902) { if(!msg.result?.success || !msg.result.contentItems?.[0]?.text.includes('displayed'))throw new Error('Widget tool did not return success');const turn=pending.get('widget');completed(turn.threadId,turn.turnId);return }
  if (!msg.method && [900,901].includes(msg.id)) {
    if(msg.id===901 && (msg.result?.action!=='accept'||JSON.stringify(msg.result.content)!=='{}')) throw new Error('Invalid MCP approval response')
    const turn = pending.get('approval')
    if (turn) { pending.delete('approval'); completed(turn.threadId, turn.turnId) }
    return
  }
  if (!msg.method) return
  const reply = result => send({ id: msg.id, result })
  if (msg.method === 'initialize') return reply({})
  if (msg.method === 'account/read') return reply({ account: { type: 'chatgpt', email: 'test@example.com', planType: 'pro', accessToken: 'DO_NOT_EXPOSE' }, token: 'DO_NOT_EXPOSE' })
  if (msg.method === 'model/list') return reply({ data: [{ id: 'gpt-6.1-sol', displayName: 'Sol' }] })
  if (msg.method === 'thread/start') { require('node:fs').appendFileSync('starts.jsonl', JSON.stringify(msg.params) + '\\n'); return reply({ thread: { id: 'thread-fake-' + nextThread++ } }) }
  if (msg.method === 'thread/resume') return reply({ thread: { id: msg.params.threadId } })
  if (msg.method === 'turn/start') {
    const turnId = 'turn-' + nextTurn++
    const threadId = msg.params.threadId
    const prompt = msg.params.input[0].text
    require('node:fs').appendFileSync('turns.jsonl', JSON.stringify({ threadId, prompt, sandbox: msg.params.sandboxPolicy }) + '\\n')
    reply({ turn: { id: turnId } })
    setTimeout(() => {
      send({ method: 'item/started', params: { threadId, turnId, item: { type: 'reasoning' } } })
      if (prompt.includes('team-peer')) send({ method: 'item/started', params: { threadId, turnId, item: { type: 'webSearch' } } })
      if (prompt.includes('team-send-test')) { pending.set('team',{threadId,turnId});send({id:903,method:'item/tool/call',params:{threadId,turnId,tool:'wendler_team',arguments:{action:'send',agentId:'homer',message:'Confirme o recebimento sem ações.'}}}); } else if (prompt.includes('widget-focus-test')) { pending.set('widget',{threadId,turnId});send({id:902,method:'item/tool/call',params:{threadId,turnId,tool:'wendler_widget',arguments:{kind:'focus',minutes:1,title:'Teste contratual'}}}); } else if (prompt.includes('mcp-approval-test')) {
        pending.set('approval', { threadId, turnId });
        send({ id:901,method:'mcpServer/elicitation/request',params:{threadId,turnId:null,serverName:'test-connector',mode:'form',message:'Autorizar consulta de teste?',requestedSchema:{type:'object',properties:{}}} });
      } else if (prompt.includes('approval-test')) {
        pending.set('approval', { threadId, turnId })
        send({ id: 900, method: 'item/commandExecution/requestApproval', params: { threadId, turnId, command: 'echo ok' } })
      } else if (prompt.includes('cancel-test')) {
        pending.set('cancel', { threadId, turnId })
        send({ method: 'item/agentMessage/delta', params: { threadId, turnId, delta: 'Iniciando' } })
      } else completed(threadId, turnId)
    }, 10)
    return
  }
  if (msg.method === 'turn/interrupt') {
    reply({})
    const turn = pending.get('cancel')
    if (turn) { pending.delete('cancel'); completed(turn.threadId, turn.turnId, 'interrupted') }
    return
  }
  reply({})
})
`

async function availablePort() {
  const server = createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return port
}

const dataDir = await mkdtemp(join(tmpdir(), 'wendler-contract-test-'))
const port = await availablePort()
const base = `http://127.0.0.1:${port}`
await writeFile(join(dataDir, 'app-server'), fakeServer)
const child = spawn(process.execPath, [fileURLToPath(new URL('../server/index.mjs', import.meta.url))], {
  cwd: dataDir,
  env: { ...process.env, WENDLER_PORT: String(port), WENDLER_DATA_DIR: dataDir, WENDLER_CODEX_BIN: process.execPath },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
child.stdout.on('data', chunk => { output += chunk })
child.stderr.on('data', chunk => { output += chunk })

async function ready() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Runtime exited: ${output}`)
    try { const status = await (await fetch(`${base}/api/status`)).json(); if (status.ready) return } catch {}
    await delay(50)
  }
  throw new Error(`Runtime did not become ready: ${output}`)
}

function run(message, mode, patch = {}) {
  const events = []
  const finished = (async () => {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ requestId: message, conversationId: 'individual:west', agent: { id: 'west', name: 'Ash', role: 'Direção criativa' }, message, context: [], mode, permissions: { files: mode === 'work', computer: false }, ...patch }),
    })
    assert.equal(response.status, 200)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const chunk = await reader.read()
      buffer += decoder.decode(chunk.value, { stream: !chunk.done })
      let index
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1)
        if (line) events.push(JSON.parse(line))
      }
      if (chunk.done) break
    }
    return events
  })()
  return { events, finished }
}

try {
  await ready()
  const account = await (await fetch(`${base}/api/account`)).json()
  assert.deepEqual(account, { authenticated: true, type: 'chatgpt', email: 'test@example.com', planType: 'pro' })
  const team = { conversationId: 'team:context-test' }
  const ash = await run('team-first', 'chat', team).finished
  const indiana = await run('team-peer', 'chat', { ...team, agent: { id: 'indiana', name: 'Indiana', role: 'Pesquisa' }, context: [{ speaker: 'Ash', text: 'Plano inicial concreto.' }] }).finished
  assert.ok(indiana.some(event => event.type === 'activity' && event.phase === 'thinking'), 'Actual reasoning events must surface thinking activity')
  assert.ok(indiana.some(event => event.type === 'activity' && event.phase === 'researching'), 'Actual search events must surface researching activity')
  const resumed = await run('team-resumed', 'chat', { ...team, context: [{ speaker: 'Indiana', text: 'Pesquisa nova: referência 42.' }], sharedContext: [{ speaker: 'Figma · conversa vinculada', text: 'Decisão visual: fundo azul.' }] }).finished
  assert.notEqual(ash.at(-1).threadId, indiana.at(-1).threadId, 'Each team persona must own an independent Codex thread')
  assert.equal(ash.at(-1).threadId, resumed.at(-1).threadId, 'Returning team persona must resume its existing thread')
  const captured = (await readFile(join(dataDir, 'turns.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse)
  assert.ok(captured[1].prompt.includes('Ash: Plano inicial concreto.'), 'Second agent must receive first agent transcript')
  assert.ok(captured[2].prompt.includes('Indiana: Pesquisa nova: referência 42.'), 'Resumed first agent must receive new peer contributions')
  assert.ok(captured[2].prompt.includes('Decisão visual: fundo azul.'), 'Linked mini transcript must reach resumed main thread')
  assert.equal(captured[2].sandbox.type, 'readOnly', 'Sharing context must preserve read-only chat mode')
  const fresh = await run('team-reset', 'chat', { ...team, contextEpoch: 'fresh-reset-session' }).finished
  assert.notEqual(fresh.at(-1).threadId, ash.at(-1).threadId, 'Reset epoch must isolate old Codex memory without renaming the chat')
  const added = await fetch(`${base}/api/plugins/connections`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'contract', transport: 'http', url: 'https://example.com/mcp', headers: { Authorization: 'Bearer PRIVATE_TEST' } }) })
  assert.equal(added.status, 201)
  assert.equal(JSON.stringify(await added.json()).includes('PRIVATE_TEST'), false)
  const afterConnection = await run('team-config-change', 'chat', team).finished
  assert.notEqual(afterConnection.at(-1).threadId, ash.at(-1).threadId, 'Changed MCP config must create a new thread rather than reuse old tools')
  const withFiles = await run('team-files-granted', 'chat', { ...team, permissions: { files: true, computer: false } }).finished
  assert.notEqual(withFiles.at(-1).threadId, afterConnection.at(-1).threadId, 'Permission change must not reuse the earlier tool inventory')
  const deniedWork = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: 'denied-work', conversationId: 'permissions', agent: { id: 'west', name: 'Ash', role: 'Test' }, message: 'Work', mode: 'work', permissions: { files: false, computer: true } }) })
  assert.equal(deniedWork.status, 403, 'Work requires explicit file permission')
  const invalidPermissions = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: 'bad-permissions', conversationId: 'permissions', agent: { id: 'west', name: 'Ash', role: 'Test' }, message: 'Chat', permissions: { files: 'yes', computer: false } }) })
  assert.equal(invalidPermissions.status, 400)
  const privateFirst = await run('private-first', 'chat', { conversationId: 'private-test', privateHistory: true }).finished
  const privateSecond = await run('private-second', 'chat', { conversationId: 'private-test', privateHistory: true }).finished
  assert.notEqual(privateFirst.at(-1).threadId, privateSecond.at(-1).threadId, 'Private history must never reuse a persisted thread')
  const starts = (await readFile(join(dataDir, 'starts.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse)
  assert.equal(starts.at(-1).ephemeral, true)
  assert.equal(starts.at(-2).ephemeral, true)
  assert.equal(starts.at(-1).config['mcp_servers.contract'].enabled, false)
  assert.equal(starts.at(-1).config.features.apps, true)
  assert.equal(starts.at(-1).config.features.shell_tool, false)
  assert.equal(starts.at(-1).config.features.unified_exec, false)
  assert.equal(starts.at(-1).config.features.view_image, false)
  assert.deepEqual(starts.at(-1).dynamicTools.map(tool=>tool.name), ['wendler_team', 'wendler_widget', 'wendler_project', 'wendler_browser', 'wendler_shopping', 'wendler_research'])
  await delay(50)
  const storedState = JSON.parse(await readFile(join(dataDir, 'state.json'), 'utf8'))
  assert.ok(!storedState.history.some(entry => /^private-/.test(entry.requestId)), 'Private responses must not enter persisted history')
  assert.ok(!Object.keys(storedState.threads).some(key => key.startsWith('private-test')), 'Private conversations must not enter thread cache')
  const teamEvents=await run('team-send-test','chat').finished
  assert.equal(teamEvents.at(-1).status,'completed')
  assert.ok(teamEvents.some(event=>event.type==='activity'&&event.text.includes('Homer')))
  const delegatedStarts=(await readFile(join(dataDir,'starts.jsonl'),'utf8')).trim().split('\n').map(JSON.parse)
  assert.ok(delegatedStarts.some(value=>value.ephemeral&&value.baseInstructions.includes('Você é Homer')))
  const widgetEvents=await run('widget-focus-test','chat').finished
  assert.equal(widgetEvents.find(event=>event.type==='widget')?.widget?.type,'focus')
  assert.ok(widgetEvents.at(-1).type==='done')
  const cancelled = run('cancel-test', 'chat')
  for (let attempt = 0; attempt < 100 && !cancelled.events.some(event => event.type === 'delta'); attempt++) await delay(20)
  assert.ok(cancelled.events.some(event => event.type === 'delta'), 'Cancel test must reach an active turn')
  const cancelResponse = await fetch(`${base}/api/cancel`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: 'cancel-test' }) })
  assert.equal(cancelResponse.status, 200)
  assert.equal((await cancelResponse.json()).cancelled, true)
  assert.equal((await cancelled.finished).at(-1)?.status, 'interrupted')

  const mcp = run('mcp-approval-test', 'chat')
  for(let attempt=0;attempt<100&&!mcp.events.some(e=>e.type==='approval');attempt++) await delay(20)
  const mcpApproval=mcp.events.find(e=>e.type==='approval')
  assert.ok(mcpApproval,'Standalone MCP request with nullable turn must appear in chat')
  const mcpDecision=await fetch(base+'/api/approvals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:mcpApproval.id,decision:'accept'})})
  assert.equal(mcpDecision.status,200)
  assert.equal((await mcp.finished).at(-1).status,'completed')

  const autonomy=await fetch(base+'/api/automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'automatic'})})
  assert.equal(autonomy.status,200)
  const automaticMcp=run('mcp-approval-test-automatic','chat')
  assert.equal((await automaticMcp.finished).at(-1).status,'completed')
  assert.ok(!automaticMcp.events.some(event=>event.type==='approval'),'Automatic connector permissions must not block on the chat Allow button')
  assert.equal((await (await fetch(base+'/api/automation')).json()).mode,'automatic')
  await fetch(base+'/api/automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'manual'})})

  const approval = run('approval-test', 'work')
  for (let attempt = 0; attempt < 100 && !approval.events.some(event => event.type === 'approval'); attempt++) await delay(20)
  const approvalId = approval.events.find(event => event.type === 'approval')?.id
  assert.ok(approvalId, 'Work mode must surface approval requests')
  const decision = await fetch(`${base}/api/approvals`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: approvalId, decision: 'accept' }) })
  assert.equal(decision.status, 200)
  assert.equal((await approval.finished).at(-1)?.status, 'completed')
  const cleared=await fetch(base+'/api/history/clear',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
  assert.equal(cleared.status,200)
  const erased=JSON.parse(await readFile(join(dataDir,'state.json'),'utf8'))
  assert.deepEqual(erased.history,[])
  assert.deepEqual(erased.threads,{})
  console.log('PASS: fake app-server cancellation, approvals, private history and clear')
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const closed = new Promise(resolve => child.once('close', resolve))
    child.kill()
    await closed
  }
  await rm(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })
}
