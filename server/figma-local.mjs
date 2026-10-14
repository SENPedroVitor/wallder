import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { randomBytes, randomUUID, randomInt, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { validateFigmaCall } from './figma-tools.mjs'

const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
export function createFigmaBridge({ dataDir, port = 5174, commandTimeout = 30000, clock = Date.now }) {
  const authFile = path.join(dataDir, 'figma-local-auth.json')
  const sessions = new Map(), commands = new Map()
  let auth, pairing, pairingAttempts = 0, attemptWindow = 0, closed = false
  const ready = (async () => {
    await mkdir(dataDir, { recursive: true })
    try { auth = JSON.parse(await readFile(authFile, 'utf8')); if (!auth.key || !Array.isArray(auth.tokens)) throw new Error('Credenciais locais inválidas.') }
    catch (error) { if (error.code !== 'ENOENT') throw error; auth = { key: randomBytes(32).toString('hex'), tokens: [] }; await persist() }
    await writeFile(path.join(dataDir, 'figma-local-client.json'), JSON.stringify({ url: `http://127.0.0.1:${port}/api/figma-local`, key: auth.key }), { mode: 0o600 })
  })()
  let queue = Promise.resolve()
  async function persist() {
    const temporary = `${authFile}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(auth), { mode: 0o600 }); await rename(temporary, authFile)
  }
  function active() { return [...sessions.values()].filter(session => clock() - session.seen < 10000) }
  function status() { return { running: !closed, connected: active().length > 0, sessions: active().map(({ token, ...session }) => session), transport: 'Plugin local', officialApiCalls: 0 } }
  async function issuePairing() { await ready; pairing = { code: String(randomInt(100000, 1000000)), expires: clock() + 10 * 60 * 1000 }; return { ...pairing } }
  async function pair(code) {
    await ready
    if (clock() - attemptWindow > 60000) { attemptWindow = clock(); pairingAttempts = 0 }
    if (++pairingAttempts > 10) throw new Error('Muitas tentativas. Aguarde um minuto.')
    if (!pairing || pairing.expires < clock() || !same(code, pairing.code)) throw new Error('Código inválido ou expirado. Gere outro no Wendler.')
    pairing = null
    const token = randomBytes(32).toString('hex')
    const operation = queue.then(async () => { auth.tokens = [...auth.tokens, token].slice(-10); await persist() })
    queue = operation.catch(() => {}); await operation
    return { token }
  }
  function pluginToken(req) {
    const token = String(req.headers.authorization ?? '').replace(/^Bearer /, '')
    if (!auth.tokens.some(saved => same(token, saved))) throw new Error('Reconecte o plugin com um novo código.')
    return token
  }
  async function call(name, args) {
    await ready; validateFigmaCall(name, args)
    if (closed) throw new Error('A ponte local foi encerrada.')
    if (name === 'figma_local_status') return status()
    const candidates = active()
    const session = args.sessionId ? candidates.find(item => item.id === args.sessionId) : candidates.length === 1 ? candidates[0] : null
    if (!session) throw new Error(candidates.length > 1 ? 'Há vários arquivos abertos. Informe sessionId retornado pelo status.' : 'Abra o plugin Wendler Local no arquivo do Figma e conecte-o primeiro.')
    if (commands.size >= 20) throw new Error('A ponte está ocupada. Aguarde as operações atuais.')
    return new Promise((resolve, reject) => {
      const id = randomUUID(), expires = clock() + commandTimeout
      const timer = setTimeout(() => { commands.delete(id); reject(new Error('O Figma não confirmou a operação a tempo. Ela pode ter sido iniciada: leia o arquivo antes de tentar repetir uma alteração.')) }, commandTimeout)
      commands.set(id, { id, sessionId: session.id, name, args, expires, state: 'queued', resolve, reject, timer })
    })
  }
  async function handlePlugin(req, res, url, body) {
    await ready
    const send = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }
    try {
      if (url.pathname.endsWith('/pair') && req.method === 'POST') return send(200, await pair((await body(req)).code))
      const token = pluginToken(req)
      if (url.pathname.endsWith('/poll') && req.method === 'POST') {
        const input = await body(req)
        if (typeof input.instanceId !== 'string' || !/^[\w-]{1,100}$/.test(input.instanceId) || typeof input.document?.name !== 'string') throw new Error('Sessão do plugin inválida.')
        const existing = sessions.get(input.instanceId)
        if (!existing && sessions.size >= 20) throw new Error('Há muitos plugins conectados. Feche os que não estiver usando.')
        if (existing && existing.token !== token) throw new Error('Sessão de outro plugin.')
        const session = { id: input.instanceId, token, seen: clock(), document: { name: input.document.name.slice(0,200), page: String(input.document.page ?? '').slice(0,200), fileKey: typeof input.document.fileKey === 'string' ? input.document.fileKey.slice(0,100) : null } }
        sessions.set(session.id, session)
        for (const [id, saved] of sessions) if (clock() - saved.seen > 60000) sessions.delete(id)
        const command = input.busy ? null : [...commands.values()].find(item => item.sessionId === session.id && item.state === 'queued' && item.expires > clock())
        if (command) command.state = 'delivered'
        return send(200, { command: command ? { id: command.id, name: command.name, args: command.args, expires: command.expires } : null })
      }
      if (url.pathname.endsWith('/result') && req.method === 'POST') {
        const input = await body(req), command = commands.get(input.id)
        if (!command) return send(410, { error: 'Operação expirada. Não repita a alteração automaticamente.' })
        if (sessions.get(command.sessionId)?.token !== token || input.instanceId !== command.sessionId || command.state !== 'delivered') throw new Error('Resultado de outra sessão.')
        commands.delete(command.id); clearTimeout(command.timer)
        if (input.error) command.reject(new Error(String(input.error).slice(0,2000))); else command.resolve(input.result)
        return send(200, { saved: true })
      }
      if (url.pathname.endsWith('/disconnect') && req.method === 'POST') {
        const input = await body(req), session = sessions.get(input.instanceId)
        if (session?.token === token) { sessions.delete(session.id); for (const command of commands.values()) if (command.sessionId === session.id) { clearTimeout(command.timer); commands.delete(command.id); command.reject(new Error('Plugin desconectado.')) } }
        return send(200, { disconnected: true })
      }
      return send(404, { error: 'Rota do plugin não encontrada.' })
    } catch (error) { return send(403, { error: error.message }) }
  }
  async function relay(req, body) {
    await ready
    if (!same(String(req.headers.authorization ?? ''), 'Bearer ' + auth.key)) throw new Error('Cliente MCP local não autorizado.')
    const input = await body(req)
    return call(input.name, input.args ?? {})
  }
  function close() { closed = true; sessions.clear(); for (const command of commands.values()) { clearTimeout(command.timer); command.reject(new Error('Ponte encerrada.')) } commands.clear() }
  return { ready, status, issuePairing, handlePlugin, relay, call, close }
}
