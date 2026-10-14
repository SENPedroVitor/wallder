import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createPluginService, validateConnection } from './plugins.mjs'

test('connection schema rejects shells, inline code and credentials in URLs', () => {
  for (const command of ['cmd', 'powershell.exe', 'bash']) assert.throws(() => validateConnection({ name: 'test', transport: 'stdio', command, args: [] }))
  assert.throws(() => validateConnection({ name: 'test', transport: 'stdio', command: 'node', args: ['-e', 'process.exit()'] }))
  assert.throws(() => validateConnection({ name: 'test', transport: 'http', url: 'https://user:secret@example.com/mcp' }))
  assert.throws(() => validateConnection({ name: 'test', transport: 'http', url: 'http://example.com/mcp' }))
  assert.throws(() => validateConnection({ name: 'test', transport: 'http', url: 'https://example.com/mcp', extra: true }))
  assert.equal(validateConnection({ name: 'test', transport: 'stdio', command: 'node', args: ['server.mjs'] }).enabled, false)
})

test('registry persists config without executing it, masks credentials, and explicit test uses real discovery', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'wendler-plugins-'))
  const requests = []
  const client = { async start() {}, async request(method, params) {
    requests.push({ method, params })
    if (method === 'plugin/list') return { marketplaces: [{ plugins: [{ id: 'installed', name: 'Installed', installed: true, enabled: true }, { id: 'catalog-only', installed: false }] }] }
    if (method === 'thread/start') return { thread: { id: 'test-thread' } }
    if (method === 'mcpServerStatus/list') return { data: [{ name: 'private', authStatus: 'bearerToken', runtimeStatus: params.threadId ? 'connected' : null, tools: { ping: { name: 'ping', description: 'Ping' } } }] }
    return {}
  } }
  const service = createPluginService({ dataDir, client })
  async function call(method, pathname, payload) {
    let code, output
    const res = { writeHead(status) { code = status }, end(body) { output = JSON.parse(body) } }
    assert.equal(await service.handle({ method }, res, new URL(pathname, 'http://localhost'), async () => payload), true)
    return { code, output }
  }
  try {
    assert.equal((await call('POST', '/api/plugins/connections', { name: 'private', transport: 'http', url: 'https://example.com/mcp', headers: { Authorization: 'Bearer VERY_SECRET' } })).code, 201)
    assert.equal(requests.length, 0)
    const listed = (await call('GET', '/api/plugins')).output
    assert.equal(JSON.stringify(listed).includes('VERY_SECRET'), false)
    assert.deepEqual(listed.connections[0].headerNames, ['Authorization'])
    assert.equal(listed.plugins.length, 1)
    assert.equal(listed.servers[0].status, 'unknown')
    assert.equal((await service.threadConfiguration())['mcp_servers.private'].enabled, false)
    await call('PATCH', '/api/plugins/connections/private', { enabled: true })
    assert.equal((await service.threadConfiguration())['mcp_servers.private'].http_headers.Authorization, 'Bearer VERY_SECRET')
    const tested = (await call('POST', '/api/plugins/connections/private/test')).output
    assert.equal(tested.status, 'connected')
    assert.equal(tested.tools[0].name, 'ping')
    assert.equal(requests.find(item => item.method === 'thread/start').params.ephemeral, true)
    assert.equal(requests.at(-1).method, 'thread/archive')
    assert.equal(JSON.parse(await readFile(path.join(dataDir, 'plugins.json'), 'utf8')).connections.length, 1)
    await call('DELETE', '/api/plugins/connections/private')
    assert.deepEqual(await service.threadConfiguration(), {})
  } finally { await rm(dataDir, { recursive: true, force: true }) }
})

test('Figma agent uses the local bridge and denies official Figma tools without disabling other agents apps', async () => {
  const dataDir=await mkdtemp(path.join(tmpdir(),'wendler-figma-config-'))
  const client={async start(){},async request(method){return method==='plugin/list'?{marketplaces:[]}:{data:[{name:'codex_apps',tools:{one:{name:'figma.get_metadata'},two:{name:'figma.use_figma'},three:{name:'acervo_faux.search_acervo'}}}]}}}
  try {
    await writeFile(path.join(dataDir,'plugins.json'),JSON.stringify({version:1,connections:[{name:'wendler-figma-local',transport:'stdio',command:'node',args:['server/figma-mcp.mjs'],enabled:true}]}))
    const service=createPluginService({dataDir,client}),figma=await service.threadConfiguration('figma'),ted=await service.threadConfiguration('ted')
    assert.equal(figma['mcp_servers.wendler-figma-local'].enabled,true)
    assert.equal(figma['apps.connector_68df038e0ba48191908c8434991bbac2.enabled'],false)
    assert.equal(figma['mcp_servers.codex_apps.disabled_tools'],undefined)
    assert.equal(ted['mcp_servers.wendler-figma-local'].enabled,false)
    assert.equal(ted['apps.connector_68df038e0ba48191908c8434991bbac2.enabled'],undefined)
    assert.equal(ted['mcp_servers.codex_apps.disabled_tools'],undefined)
  } finally {await rm(dataDir,{recursive:true,force:true})}
})
