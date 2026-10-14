import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const allowed = new Set(['name', 'transport', 'command', 'args', 'url', 'headers', 'enabled'])
const safeErrors = new Set(['Configuração inválida', 'Use um nome com letras, números, hífen ou sublinhado', 'Estado inválido', 'Comando inválido', 'Informe o executável MCP diretamente, sem shell', 'Argumentos devem ser uma lista JSON de textos', 'Informe um arquivo de servidor; avaliação inline não é permitida', 'URL inválida', 'Use HTTPS sem credenciais na URL', 'Informe credenciais nos cabeçalhos, sem query na URL', 'Cabeçalhos inválidos', 'Transporte inválido', 'Registro de conexões inválido', 'Conexão não encontrada', 'Nome já utilizado', 'Envie apenas enabled', 'Servidor ausente no inventário Codex'])
export function validateConnection(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.has(key))) throw new Error('Configuração inválida')
  if (typeof input.name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(input.name)) throw new Error('Use um nome com letras, números, hífen ou sublinhado')
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') throw new Error('Estado inválido')
  const result = { name: input.name, transport: input.transport, enabled: input.enabled ?? false }
  if (input.transport === 'stdio') {
    if (typeof input.command !== 'string' || !input.command.trim() || input.command.length > 2048 || /[\r\n\0]/.test(input.command)) throw new Error('Comando inválido')
    const executable = path.basename(input.command).toLowerCase().replace(/\.(exe|cmd|bat)$/, '')
    if (['cmd', 'powershell', 'pwsh', 'bash', 'sh', 'wscript', 'cscript'].includes(executable)) throw new Error('Informe o executável MCP diretamente, sem shell')
    if (!Array.isArray(input.args) || input.args.length > 100 || input.args.some(arg => typeof arg !== 'string' || arg.length > 4096 || /[\0\r\n]/.test(arg))) throw new Error('Argumentos devem ser uma lista JSON de textos')
    if (['node', 'nodejs'].includes(executable) && input.args.some(arg => /^(--eval|--print|-e|-p)(=|$)/.test(arg))) throw new Error('Informe um arquivo de servidor; avaliação inline não é permitida')
    result.command = input.command.trim(); result.args = input.args
  } else if (input.transport === 'http') {
    let url
    try { url = new URL(input.url) } catch { throw new Error('URL inválida') }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('Use HTTPS sem credenciais na URL')
    if (url.search) throw new Error('Informe credenciais nos cabeçalhos, sem query na URL')
    const headers = input.headers ?? {}
    if (typeof headers !== 'object' || Array.isArray(headers) || Object.keys(headers).length > 20 || Object.entries(headers).some(([key, value]) => !/^[a-zA-Z0-9-]{1,100}$/.test(key) || typeof value !== 'string' || value.length > 8192 || /[\r\n\0]/.test(value))) throw new Error('Cabeçalhos inválidos')
    result.url = url.href; result.headers = headers
  } else throw new Error('Transporte inválido')
  return result
}

const configuration = connection => connection.transport === 'http'
  ? { url: connection.url, http_headers: connection.headers, enabled: connection.enabled }
  : { command: connection.command, args: connection.args, enabled: connection.enabled }
const publicConnection = connection => ({ name: connection.name, transport: connection.transport, enabled: connection.enabled, command: connection.command, argsCount: connection.args?.length ?? 0, url: connection.url, headerNames: Object.keys(connection.headers ?? {}) })
const publicStatus = server => ({ name: server.name, pluginId: server.pluginId, authStatus: server.authStatus, status: server.runtimeStatus ?? 'unknown', origin: server.httpOrigin, tools: Object.entries(server.tools ?? {}).map(([key, tool]) => ({ name: tool.name ?? key, description: tool.description ?? '' })), error: server.toolsError ? 'A descoberta de ferramentas falhou. Verifique a configuração e a autenticação.' : null })

export function createPluginService({ dataDir, client }) {
  const file = path.join(dataDir, 'plugins.json')
  let mutation = Promise.resolve()
  const tested = new Map()
  async function read() {
    try {
      const saved = JSON.parse(await readFile(file, 'utf8'))
      if (saved.version !== 1 || !Array.isArray(saved.connections)) throw new Error('Registro de conexões inválido')
      return saved.connections.map(validateConnection)
    } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  }
  async function change(callback) {
    const operation = mutation.then(async () => {
      const connections = await read(); await callback(connections)
      await mkdir(dataDir, { recursive: true })
      const temporary = `${file}.${randomUUID()}.tmp`
      await writeFile(temporary, JSON.stringify({ version: 1, connections }, null, 2), { mode: 0o600 })
      await rename(temporary, file)
    })
    mutation = operation.catch(() => {})
    return operation
  }
  async function threadConfiguration(agentId) {
    const connections = await read()
    const config = Object.fromEntries(connections.map(connection => [`mcp_servers.${connection.name}`, { ...configuration(connection), ...(agentId && connection.name === 'wendler-figma-local' && agentId !== 'figma' ? { enabled: false } : {}) }]))
    if (agentId === 'figma') {
      config['apps.connector_68df038e0ba48191908c8434991bbac2.enabled'] = false
      const actual = await inventory()
      for (const server of actual.servers) {
        // codex_apps is synthesized by the runtime, not a configured transport.
        // Its Figma app is disabled above; adding an MCP server override would
        // create an invalid transport and prevent this agent from starting.
        if (server.name === 'codex_apps') continue
        const official = server.tools.filter(tool => tool.name.startsWith('figma.')).map(tool => tool.name)
        if (official.length) config[`mcp_servers.${server.name}.disabled_tools`] = official
      }
    }
    return config
  }
  async function inventory(threadId) {
    await client.start()
    const results = await Promise.allSettled([
      client.request('plugin/list', { marketplaceKinds: ['local'], forceRefetch: false }),
      client.request('mcpServerStatus/list', { detail: 'toolsAndAuthOnly', limit: 100, ...(threadId ? { threadId } : {}) }),
    ])
    const plugins = results[0].status === 'fulfilled' ? (results[0].value.marketplaces ?? []).flatMap(market => market.plugins ?? []).filter(plugin => plugin.installed).map(plugin => ({ id: plugin.id, name: plugin.interface?.displayName ?? plugin.name, enabled: plugin.enabled, installed: plugin.installed })) : []
    let servers = results[1].status === 'fulfilled' ? results[1].value.data ?? [] : []
    let cursor = results[1].status === 'fulfilled' ? results[1].value.nextCursor : null
    for (let page = 0; cursor && page < 20; page++) {
      const next = await client.request('mcpServerStatus/list', { cursor, detail: 'toolsAndAuthOnly', limit: 100, ...(threadId ? { threadId } : {}) })
      servers.push(...next.data); cursor = next.nextCursor
    }
    return { plugins, servers: servers.map(publicStatus), errors: results.flatMap((result, index) => result.status === 'rejected' ? [index ? 'Inventário MCP indisponível no Codex' : 'Plugins indisponíveis no Codex'] : []) }
  }
  async function test(name) {
    const connection = (await read()).find(item => item.name === name)
    if (!connection) throw new Error('Conexão não encontrada')
    await client.start()
    const started = await client.request('thread/start', { ephemeral: true, config: { [`mcp_servers.${name}`]: { ...configuration(connection), enabled: true } } })
    const threadId = started.thread.id
    try {
      const result = await client.request('mcpServerStatus/list', { threadId, serverName: name, detail: 'toolsAndAuthOnly' }, 60000)
      const status = result.data?.find(item => item.name === name)
      if (!status) throw new Error('Servidor ausente no inventário Codex')
      const visible = publicStatus(status); tested.set(name, visible); return visible
    } finally { await client.request('thread/archive', { threadId }).catch(() => {}) }
  }
  async function handle(req, res, url, bodyFn) {
    if (!url.pathname.startsWith('/api/plugins')) return false
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }
    try {
      if (req.method === 'GET' && url.pathname === '/api/plugins') {
        const connections = await read()
        let actual
        try { actual = await inventory(url.searchParams.get('threadId') || undefined) } catch { actual = { plugins: [], servers: [], errors: ['Codex indisponível. Inicie o backend para descobrir ferramentas.'] } }
        send(200, { ...actual, connections: connections.map(connection => ({ ...publicConnection(connection), test: tested.get(connection.name) ?? null })) })
      } else if (req.method === 'POST' && url.pathname === '/api/plugins/connections') {
        const connection = validateConnection(await bodyFn(req))
        await change(items => { if (items.some(item => item.name === connection.name)) throw new Error('Nome já utilizado'); items.push(connection) })
        send(201, publicConnection(connection))
      } else {
        const match = /^\/api\/plugins\/connections\/([a-zA-Z][a-zA-Z0-9_-]{0,63})(\/test)?$/.exec(url.pathname)
        if (!match) { send(404, { error: 'Rota não encontrada' }); return true }
        const name = match[1]
        if (match[2] && req.method === 'POST') send(200, await test(name))
        else if (!match[2] && req.method === 'PATCH') {
          const body = await bodyFn(req)
          if (!body || Object.keys(body).length !== 1 || typeof body.enabled !== 'boolean') throw new Error('Envie apenas enabled')
          await change(items => { const item = items.find(item => item.name === name); if (!item) throw new Error('Conexão não encontrada'); item.enabled = body.enabled }); tested.delete(name); send(200, { ok: true })
        } else if (!match[2] && req.method === 'DELETE') {
          await change(items => { const index = items.findIndex(item => item.name === name); if (index < 0) throw new Error('Conexão não encontrada'); items.splice(index, 1) }); tested.delete(name); send(200, { ok: true })
        } else send(405, { error: 'Método não permitido' })
      }
    } catch (error) { send(400, { error: safeErrors.has(error.message) ? error.message : 'Não foi possível concluir a operação. Confira a configuração e a disponibilidade do servidor.' }) }
    return true
  }
  return { handle, threadConfiguration, inventory, test }
}
