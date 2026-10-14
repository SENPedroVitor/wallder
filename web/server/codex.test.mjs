import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough, Writable } from 'node:stream'
import { CodexClient } from './codex.mjs'

test('app-server RPC handles split lines, replies, and notifications', async () => {
  const process = new EventEmitter()
  process.stdout = new PassThrough()
  process.stderr = new PassThrough()
  const sent = []
  process.stdin = new Writable({ write(chunk, _, callback) { sent.push(JSON.parse(chunk.toString())); callback() } })
  const client = new CodexClient({ spawnProcess: () => process })
  const starting = client.start()
  assert.equal(sent[0].method, 'initialize')
  process.stdout.write(`{"id":${sent[0].id},"result":{}}\n`)
  await starting
  assert.equal(client.ready, true)
  assert.equal(sent[1].method, 'initialized')
  const received = []
  client.on('message', message => received.push(message))
  const pending = client.request('model/list', {})
  const id = sent.at(-1).id
  process.stdout.write(`{"method":"turn/completed","params":{"threadId":"a"}}\n{"id":${id},"res`)
  process.stdout.write('ult":{"data":[]}}\n')
  assert.deepEqual(await pending, { data: [] })
  assert.equal(received[0].method, 'turn/completed')
  process.emit('exit', 0)
  assert.equal(client.ready, false)
})
