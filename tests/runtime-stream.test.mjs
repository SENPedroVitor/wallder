import test from 'node:test'
import assert from 'node:assert/strict'
import { readRuntimeStream } from '../src/runtime.ts'

test('NDJSON tolerates UTF-8 and JSON records split at every byte', async () => {
  const expected = [{ type: 'delta', text: 'Olá, ação e memória.' }, { type: 'done', text: 'Concluído' }]
  const bytes = new TextEncoder().encode(expected.map(event => JSON.stringify(event)).join('\n'))
  const stream = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close() } })
  const actual = []
  await readRuntimeStream(new Response(stream), event => actual.push(event))
  assert.deepEqual(actual, expected)
})

test('HTTP errors are surfaced instead of rendered as agent answers', async () => {
  await assert.rejects(readRuntimeStream(new Response(JSON.stringify({ error: 'Agente ocupado' }), { status: 409 }), () => assert.fail('Must not emit')), /Agente ocupado/)
})

test('corrupt stream fails rather than silently accepting partial success', async () => {
  await assert.rejects(readRuntimeStream(new Response('{invalid}\n'), () => {}), SyntaxError)
})
