import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { request as httpRequest } from 'node:http'
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

async function statusWithHost(port, host) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port, path: '/api/status', headers: { Host: host } }, res => {
      res.resume()
      res.once('end', () => resolve(res.statusCode))
    })
    req.once('error', reject)
    req.end()
  })
}

const port = await availablePort()
const dataDir = await mkdtemp(join(tmpdir(), 'wendler-runtime-test-'))
const base = `http://127.0.0.1:${port}`
const sentinel = 'WENDLER_SECRET_MUST_NOT_LEAK'
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    WENDLER_PORT: String(port),
    WENDLER_DATA_DIR: dataDir,
    WENDLER_CODEX_BIN: 'wendler-nonexistent-codex-executable',
    OPENAI_API_KEY: sentinel,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
child.stdout.on('data', chunk => { output += chunk })
child.stderr.on('data', chunk => { output += chunk })

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Runtime exited early: ${output}`)
    try { return await fetch(`${base}/api/status`) } catch { await delay(50) }
  }
  throw new Error(`Runtime did not start: ${output}`)
}

try {
  const statusResponse = await waitForServer()
  assert.equal(statusResponse.status, 200)
  const statusText = await statusResponse.text()
  const status = JSON.parse(statusText)
  assert.equal(status.ready, false, 'Missing Codex executable should be reported as unavailable')
  assert.ok(!statusText.includes(sentinel), 'Status must not expose process credentials')

  const foreignOrigin = await fetch(`${base}/api/status`, { headers: { Origin: 'https://untrusted.example' } })
  assert.equal(foreignOrigin.status, 403, 'Foreign browser origins must be rejected')

  const foreignHostStatus = await statusWithHost(port, 'untrusted.example')
  assert.equal(foreignHostStatus, 403, 'A foreign Host header must be rejected')

  const invalidChat = await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '' }),
  })
  assert.ok(invalidChat.status >= 400 && invalidChat.status < 500, 'Invalid chat input must fail before starting Codex')

  const existingChat = await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'request-1', conversationId: 'individual:west', agent: { id: 'west', name: 'Ash', role: 'Direção criativa' }, message: 'Olá', context: [] }),
  })
  assert.equal(existingChat.status, 503, 'Existing permanent chat IDs must pass validation before unavailable Codex is reported')

  const tooLarge = await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'oversize', conversationId: 'test', agent: 'west', message: 'x'.repeat(2_000_000) }),
  })
  assert.ok(tooLarge.status >= 400 && tooLarge.status < 500, 'Oversized input must be rejected')
  assert.ok(!output.includes(sentinel), 'Runtime logs must not expose process credentials')
  console.log('PASS: local runtime startup, unavailable Codex status, origin and host checks, input limits, credential redaction')
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const closed = new Promise(resolve => child.once('close', resolve))
    child.kill()
    await closed
  }
  await rm(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })
}
