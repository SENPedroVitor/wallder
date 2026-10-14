import test from 'node:test'
import assert from 'node:assert/strict'
import { createId } from '../src/ids.ts'

test('chat IDs work when the browser lacks randomUUID', () => {
  let seed = 0
  const source = { getRandomValues(bytes) { for (let i = 0; i < bytes.length; i++) bytes[i] = seed++; return bytes } }
  const first = createId(source)
  const second = createId(source)
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.match(second, /^[\w-]{1,100}$/)
  assert.notEqual(first, second)
})

test('supported browsers retain their native ID generator', () => {
  const expected = '6d9abf75-2f7e-41cc-95ea-649956bc1ea3'
  const source = { randomUUID() { return expected }, getRandomValues() { assert.fail('Native generator should be used') } }
  assert.equal(createId(source), expected)
})
