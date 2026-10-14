import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { Readable } from 'node:stream'
import { createRoutineEngine, isRoutineDue, saoPauloParts } from '../server/routines.mjs'

const routine = {
  id: 'morning', chatId: 'chat-1', name: 'Resumo', instruction: 'Resuma o dia.',
  frequency: 'Todos os dias', time: '09:00', active: true,
  agent: { id: 'agent-1', name: 'Agente', role: 'Assistente' }, context: [{ speaker: 'Usuário', text: 'Contexto salvo' }],
}

function request(engine, method, pathname, input) {
  const req = Readable.from(input === undefined ? [] : [Buffer.from(JSON.stringify(input))])
  req.method = method
  req.headers = { 'content-type': 'application/json' }
  const result = { status: 0, body: '' }
  const res = {
    writableEnded: false,
    writeHead(status) { result.status = status },
    end(body) { result.body = body; this.writableEnded = true },
  }
  return engine.handle(req, res, new URL(pathname, 'http://127.0.0.1:5174')).then(handled => ({ handled, status: result.status, body: JSON.parse(result.body) }))
}

test('São Paulo schedule honors weekdays, local time, and one run per day', () => {
  const monday = new Date('2026-10-05T12:00:00.000Z')
  assert.deepEqual(saoPauloParts(monday), { day: '2026-10-05', time: '09:00', weekday: 'Mon' })
  assert.equal(isRoutineDue(routine, new Date('2026-10-05T11:59:00Z')), false)
  assert.equal(isRoutineDue(routine, monday), true)
  assert.equal(isRoutineDue({ ...routine, lastRunDay: '2026-10-05' }, monday), false)
  assert.equal(isRoutineDue({ ...routine, frequency: 'Dias úteis' }, new Date('2026-10-04T12:00:00Z')), false)
  assert.equal(isRoutineDue({ ...routine, frequency: 'Toda segunda-feira' }, monday), true)
  assert.equal(isRoutineDue({ ...routine, frequency: 'Toda segunda-feira' }, new Date('2026-10-06T12:00:00Z')), false)
  assert.equal(isRoutineDue({ ...routine, active: false }, monday), false)
})

test('saves a past schedule for tomorrow, runs once, and reloads persisted result', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'wendler-routine-'))
  let current = new Date('2026-10-05T13:00:00.000Z')
  const requests = []
  const fetchImpl = async (url, options) => {
    requests.push({ url, input: JSON.parse(options.body) })
    return new Response(`${JSON.stringify({ type: 'delta', text: 'Bom ' })}\n${JSON.stringify({ type: 'done', text: 'Bom dia', status: 'completed' })}\n`, {
      status: 200, headers: { 'content-type': 'application/x-ndjson' },
    })
  }
  try {
    const engine = await createRoutineEngine({ dataDir: dir, port: 5174, now: () => current, fetchImpl, autoStart: false })
    const saved = await request(engine, 'POST', '/api/routines', routine)
    assert.equal(saved.status, 200)
    assert.equal(saved.body.routine.lastRunDay, '2026-10-05')
    await engine.tick()
    assert.equal(requests.length, 0)
    current = new Date('2026-10-06T12:00:00.000Z')
    await engine.tick()
    await engine.close()
    assert.equal(requests.length, 1)
    assert.equal(requests[0].url, 'http://127.0.0.1:5174/api/chat')
    assert.equal(requests[0].input.conversationId, 'routine:morning')
    assert.deepEqual(requests[0].input.context, routine.context)
    assert.equal(requests[0].input.mode, 'chat')
    const persisted = JSON.parse(await readFile(path.join(dir, 'routines.json'), 'utf8'))
    assert.equal(persisted.results[0].text, 'Bom dia')
    const reopened = await createRoutineEngine({ dataDir: dir, port: 5174, now: () => current, fetchImpl, autoStart: false })
    assert.equal((await request(reopened, 'GET', '/api/routines/results?chatId=chat-1')).body.results.length, 1)
    await reopened.tick()
    await reopened.close()
    assert.equal(requests.length, 1)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('manual run records backend errors and accepts a paused routine', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'wendler-routine-'))
  let current = new Date('2026-10-05T11:00:00.000Z')
  const fetchImpl = async () => new Response(JSON.stringify({ error: 'Codex indisponível ou sem login ChatGPT.' }), {
    status: 503, headers: { 'content-type': 'application/json' },
  })
  try {
    const engine = await createRoutineEngine({ dataDir: dir, port: 5174, now: () => current, fetchImpl, autoStart: false })
    await request(engine, 'POST', '/api/routines', routine)
    const run = await request(engine, 'POST', '/api/routines/run', { id: routine.id })
    assert.equal(run.status, 502)
    assert.equal(run.body.result.status, 'failed')
    assert.match(run.body.result.error, /sem login/)
    await request(engine, 'POST', '/api/routines', { ...routine, active: false })
    assert.equal((await request(engine, 'POST', '/api/routines/run', { id: routine.id })).status, 502)
    assert.equal((await request(engine, 'GET', '/api/routines')).body.routines[0].active, false)
    await engine.tick()
    assert.equal((await request(engine, 'GET', '/api/routines/results')).body.results.length, 2)
    assert.equal((await request(engine, 'GET', '/api/routines/results?chatId=other')).body.results.length, 0)
    await engine.close()
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('accepts colon chat IDs and deletes the persisted schedule', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'wendler-routine-'))
  const current = new Date('2026-10-05T11:00:00.000Z')
  let calls = 0
  const fetchImpl = async () => { calls++; return new Response(`${JSON.stringify({ type: 'done', text: 'Feito', status: 'completed' })}\n`) }
  try {
    const engine = await createRoutineEngine({ dataDir: dir, port: 5174, now: () => current, fetchImpl, autoStart: false })
    assert.equal((await request(engine, 'POST', '/api/routines', { ...routine, chatId: 'individual:west', active: false })).status, 200)
    assert.equal((await request(engine, 'POST', '/api/routines/run', { id: routine.id })).status, 200)
    assert.equal((await request(engine, 'GET', '/api/routines/results?chatId=individual:west')).body.results.length, 1)
    assert.equal((await request(engine, 'POST', '/api/routines/delete', { id: routine.id })).body.deleted, true)
    assert.equal((await request(engine, 'GET', '/api/routines')).body.routines.length, 0)
    await engine.close()
    const reopened = await createRoutineEngine({ dataDir: dir, port: 5174, now: () => current, fetchImpl, autoStart: false })
    await reopened.tick()
    assert.equal((await request(reopened, 'GET', '/api/routines')).body.routines.length, 0)
    assert.equal(calls, 1)
    await reopened.close()
  } finally { await rm(dir, { recursive: true, force: true }) }
})
