import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const frequencies = new Set(['Todos os dias', 'Dias úteis', 'Toda segunda-feira'])
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const limited = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const invalid = message => Object.assign(new Error(message), { status: 400 })

export function saoPauloParts(date) {
  const fields = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]))
  return { day: `${fields.year}-${fields.month}-${fields.day}`, time: `${fields.hour}:${fields.minute}`, weekday: fields.weekday }
}

export function isRoutineDue(routine, date) {
  if (!routine.active) return false
  const local = saoPauloParts(date)
  if (routine.lastRunDay === local.day || local.time < routine.time) return false
  if (routine.frequency === 'Dias úteis' && ['Sat', 'Sun'].includes(local.weekday)) return false
  if (routine.frequency === 'Toda segunda-feira' && local.weekday !== 'Mon') return false
  return true
}

function validateRoutine(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Rotina inválida.')
  const id = limited(input.id, 100)
  const chatId = limited(input.chatId, 100)
  const name = limited(input.name, 120)
  const instruction = limited(input.instruction, 12000)
  if (!/^[\w-]{1,100}$/.test(id) || !/^[\w:-]{1,100}$/.test(chatId)) throw invalid('Identificador inválido.')
  if (!name || !instruction || typeof input.name !== 'string' || input.name.length > 120 || typeof input.instruction !== 'string' || input.instruction.length > 12000) throw invalid('Nome ou instrução inválida.')
  if (!frequencies.has(input.frequency) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time || '')) throw invalid('Frequência ou horário inválido.')
  if (typeof input.active !== 'boolean') throw invalid('Estado da rotina inválido.')
  const sourceAgent = input.agent
  if (!sourceAgent || typeof sourceAgent !== 'object' || !/^[\w-]{1,100}$/.test(sourceAgent.id || '') || !limited(sourceAgent.name, 100) || !limited(sourceAgent.role, 500)) throw invalid('Agente inválido.')
  if (JSON.stringify(sourceAgent).length > 2000) throw invalid('Agente muito grande.')
  if (!Array.isArray(input.context) || input.context.length > 40 || input.context.some(entry =>
    !entry || typeof entry.speaker !== 'string' || entry.speaker.length > 80 ||
    typeof entry.text !== 'string' || entry.text.length > 8000)) throw invalid('Contexto inválido.')
  return {
    id, chatId, name, instruction, frequency: input.frequency, time: input.time,
    active: input.active,
    agent: { id: sourceAgent.id, name: limited(sourceAgent.name, 100), role: limited(sourceAgent.role, 500),
      tone: limited(sourceAgent.tone, 200), humor: limited(sourceAgent.humor, 200) },
    context: input.context.map(entry => ({ speaker: entry.speaker, text: entry.text })),
  }
}

async function readBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw Object.assign(new Error('JSON obrigatório.'), { status: 415 })
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 400_000) throw Object.assign(new Error('Pedido muito grande.'), { status: 413 })
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw invalid('JSON inválido.') }
}

function reply(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(payload))
}

async function consumeChat(response) {
  if (!response.ok) {
    let error = `Resposta HTTP ${response.status}.`
    try { error = (await response.json()).error || error } catch {}
    throw new Error(error)
  }
  if (!response.body) throw new Error('Resposta do agente vazia.')
  let pending = ''
  let delta = ''
  let done
  let reportedError = ''
  const decoder = new TextDecoder()
  for await (const chunk of response.body) {
    pending += decoder.decode(chunk, { stream: true })
    if (pending.length > 1_000_000) throw new Error('Resposta do agente muito grande.')
    let newline
    while ((newline = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, newline).trim()
      pending = pending.slice(newline + 1)
      if (!line) continue
      let event
      try { event = JSON.parse(line) } catch { throw new Error('Resposta do agente inválida.') }
      if (event.type === 'delta') delta = (delta + String(event.text || '')).slice(-100_000)
      if (event.type === 'error') reportedError = String(event.message || 'A resposta falhou.').slice(0, 1000)
      if (event.type === 'done') done = event
    }
  }
  pending += decoder.decode()
  if (!done || done.status !== 'completed') throw new Error(reportedError || 'A resposta não foi concluída.')
  return String(done.text || delta).slice(0, 100_000)
}

/** Local, persistent routine API. Optional now/fetchImpl/intervalMs/autoStart are test seams. */
export async function createRoutineEngine({ dataDir, port, now = () => new Date(), fetchImpl = fetch, intervalMs = 30_000, autoStart = true }) {
  if (!dataDir || !Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535) throw new Error('Configuração de rotinas inválida.')
  await mkdir(dataDir, { recursive: true })
  const file = path.join(dataDir, 'routines.json')
  let state = { routines: [], results: [] }
  try {
    const loaded = JSON.parse(await readFile(file, 'utf8'))
    if (Array.isArray(loaded.routines) && Array.isArray(loaded.results)) {
      state = { routines: loaded.routines.slice(0, 100), results: loaded.results.slice(-200) }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  let saving = Promise.resolve()
  let running = Promise.resolve()
  let closed = false
  const active = new Map()
  const queued = new Set()
  const controllers = new Map()
  async function save() {
    const snapshot = JSON.stringify(state)
    saving = saving.catch(() => {}).then(async () => {
      const temp = `${file}.${randomUUID()}.tmp`
      await writeFile(temp, snapshot, { encoding: 'utf8', mode: 0o600 })
      await rename(temp, file)
    })
    return saving
  }
  async function execute(routine, manual = false) {
    const current = state.routines.find(item => item.id === routine.id)
    if (closed || !current || (!manual && !current.active)) throw Object.assign(new Error('Rotina desativada.'), { status: 409 })
    if (active.has(routine.id)) throw Object.assign(new Error('Esta rotina já está em execução.'), { status: 409 })
    routine = current
    active.set(routine.id, true)
    const controller = new AbortController()
    controllers.set(routine.id, controller)
    try {
      const request = {
        requestId: randomUUID(), conversationId: `routine:${routine.id}`, mode: 'chat',
        agent: routine.agent, message: routine.instruction, context: routine.context,
      }
      const response = await fetchImpl(`http://127.0.0.1:${port}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal,
      })
      const text = await consumeChat(response)
      const result = { id: randomUUID(), routineId: routine.id, chatId: routine.chatId, agentId: routine.agent.id,
        text, at: now().toISOString(), status: 'completed' }
      state.results.push(result)
      state.results = state.results.slice(-200)
      await save()
      return result
    } catch (error) {
      if (closed && controller.signal.aborted) throw error
      const result = { id: randomUUID(), routineId: routine.id, chatId: routine.chatId, agentId: routine.agent.id,
        text: '', at: now().toISOString(), status: 'failed', error: limited(error.message, 1000) || 'Falha desconhecida.' }
      state.results.push(result)
      state.results = state.results.slice(-200)
      await save()
      return result
    } finally {
      controllers.delete(routine.id)
      active.delete(routine.id)
    }
  }
  function enqueue(routine, manual = false) {
    if (queued.has(routine.id) || active.has(routine.id)) throw Object.assign(new Error('Esta rotina já está em execução.'), { status: 409 })
    queued.add(routine.id)
    const task = running.catch(() => {}).then(() => execute(routine, manual)).finally(() => queued.delete(routine.id))
    running = task.catch(() => {})
    return task
  }
  async function tick() {
    if (closed) return
    const date = now()
    const day = saoPauloParts(date).day
    const jobs = []
    for (const routine of state.routines) {
      if (!isRoutineDue(routine, date)) continue
      routine.lastRunDay = day
      await save()
      try { jobs.push(enqueue(routine)) } catch { /* An existing manual run covers this interval. */ }
    }
    await Promise.allSettled(jobs)
  }
  const timer = autoStart ? setInterval(() => { void tick().catch(() => {}) }, intervalMs) : null
  timer?.unref()
  if (autoStart) void tick().catch(() => {})
  async function handle(req, res, url) {
    const pathname = url.pathname
    if (!['/api/routines', '/api/routines/run', '/api/routines/results', '/api/routines/delete'].includes(pathname)) return false
    try {
      if (pathname === '/api/routines' && req.method === 'GET') {
        reply(res, 200, { routines: state.routines })
      } else if (pathname === '/api/routines' && req.method === 'POST') {
        const routine = validateRoutine(await readBody(req))
        const index = state.routines.findIndex(item => item.id === routine.id)
        if (index < 0 && state.routines.length >= 100) throw Object.assign(new Error('Limite de rotinas atingido.'), { status: 413 })
        const previous = state.routines[index]
        // A newly enabled or moved schedule that has passed starts on the next local day.
        const local = saoPauloParts(now())
        const scheduleChanged = !previous || previous.time !== routine.time || previous.frequency !== routine.frequency || (!previous.active && routine.active)
        routine.lastRunDay = scheduleChanged && routine.time <= local.time ? local.day : previous?.lastRunDay || ''
        if (index >= 0) state.routines[index] = routine
        else state.routines.push(routine)
        await save()
        reply(res, 200, { routine })
      } else if (pathname === '/api/routines/run' && req.method === 'POST') {
        const input = await readBody(req)
        const routine = state.routines.find(item => item.id === input?.id)
        if (!routine) throw Object.assign(new Error('Rotina não encontrada.'), { status: 404 })
        const result = await enqueue(routine, true)
        reply(res, result.status === 'completed' ? 200 : 502, { result })
      } else if (pathname === '/api/routines/delete' && req.method === 'POST') {
        const input = await readBody(req)
        if (!/^[\w-]{1,100}$/.test(input?.id || '')) throw invalid('Identificador inválido.')
        const before = state.routines.length
        state.routines = state.routines.filter(item => item.id !== input.id)
        controllers.get(input.id)?.abort()
        if (before !== state.routines.length) await save()
        reply(res, 200, { deleted: before !== state.routines.length })
      } else if (pathname === '/api/routines/results' && req.method === 'GET') {
        const chatId = url.searchParams.get('chatId')
        if (chatId && !/^[\w:-]{1,100}$/.test(chatId)) throw invalid('Identificador inválido.')
        reply(res, 200, { results: state.results.filter(result => !chatId || result.chatId === chatId) })
      } else reply(res, 405, { error: 'Método não permitido.' })
    } catch (error) {
      if (!res.writableEnded) reply(res, error.status || 500, { error: error.message || 'Falha nas rotinas.' })
    }
    return true
  }
  async function close() {
    closed = true
    if (timer) clearInterval(timer)
    for (const controller of controllers.values()) controller.abort()
    await running.catch(() => {})
    await saving.catch(() => {})
  }
  return { handle, close, tick }
}
