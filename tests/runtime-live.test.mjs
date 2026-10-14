import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

async function availablePort() {
  const server = createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return port
}

async function startRuntime(dataDir) {
  const port = await availablePort()
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, WENDLER_PORT: String(port), WENDLER_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  for (let attempt = 0; attempt < 300; attempt++) {
    if (child.exitCode !== null) throw new Error(`Runtime exited: ${output}`)
    try {
      const response = await fetch(`${base}/api/status`)
      const status = await response.json()
      if (status.ready) return { base, child }
      if (attempt === 299) throw new Error(`Codex unavailable: ${status.error || output}`)
    } catch (error) { if (attempt === 299) throw error }
    await delay(100)
  }
  throw new Error(`Runtime did not start: ${output}`)
}

async function stopRuntime(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const closed = new Promise(resolve => child.once('close', resolve))
  child.kill()
  await closed
}

async function chat(base, requestId, message) {
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(90000),
    body: JSON.stringify({ requestId, conversationId: 'individual:west', agent: { id: 'west', name: 'Ash', role: 'Direção criativa' }, message, context: [], mode: 'chat' }),
  })
  if (response.status !== 200) throw new Error(`Chat HTTP ${response.status}: ${await response.text()}`)
  const records = (await response.text()).trim().split('\n').map(line => JSON.parse(line))
  const done = records.find(record => record.type === 'done')
  assert.ok(done, `Missing done event: ${JSON.stringify(records).slice(-1000)}`)
  assert.equal(done.status, 'completed')
  assert.ok(String(done.text).trim(), 'Codex must return a nonempty answer')
  return done
}

if (!process.env.WENDLER_LIVE_TEST) {
  console.log('SKIP: set WENDLER_LIVE_TEST=1 to run a real Codex conversation and restart test')
} else {
  const dataDir = await mkdtemp(join(tmpdir(), 'wendler-live-test-'))
  let runtime
  try {
    runtime = await startRuntime(dataDir)
    const models = await (await fetch(`${runtime.base}/api/models`)).json()
    assert.ok(models.models?.length, 'Ready runtime must offer at least one model')
    const first = await chat(runtime.base, 'live-first', 'Responda com uma frase curta em português.')
    const state = JSON.parse(await readFile(join(dataDir, 'state.json'), 'utf8'))
    const threadId = Object.values(state.threads)[0]
    assert.equal(threadId, first.threadId)
    await stopRuntime(runtime.child)
    runtime = await startRuntime(dataDir)
    const second = await chat(runtime.base, 'live-second', 'Responda com outra frase curta em português.')
    assert.equal(second.threadId, threadId, 'The permanent chat must resume the same Codex thread after restart')
    console.log('PASS: authenticated Codex, model catalog, streamed turn completion, persistent thread resume')
  } finally {
    if (runtime) await stopRuntime(runtime.child)
    await rm(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })
  }
}
