import test from 'node:test'
import assert from 'node:assert/strict'
import { isAuthorizedOrigin } from './request-origin.mjs'

const remoteOrigin = 'https://desktop.example.ts.net'
const options = { port: 5175, uiPort: 5173, remoteOrigin }

test('permite somente a origem HTTPS remota configurada exatamente', () => {
  assert.equal(isAuthorizedOrigin(remoteOrigin, options), true)
  for (const origin of ['https://desktop.example.ts.net.evil.test', 'https://other.example.ts.net', remoteOrigin + '/path', remoteOrigin + '/', remoteOrigin + '?query=1', remoteOrigin + '#fragment', 'https://user@desktop.example.ts.net', 'http://desktop.example.ts.net', 'null', 'invalid', undefined]) {
    assert.equal(isAuthorizedOrigin(origin, options), false, String(origin))
  }
  assert.equal(isAuthorizedOrigin(remoteOrigin, { port: 5175, uiPort: 5173 }), false)
})

test('mantém origens HTTP loopback nas portas da interface e backend', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    for (const port of [5173, 5175]) assert.equal(isAuthorizedOrigin('http://' + host + ':' + port, options), true)
  }
  for (const origin of ['http://localhost:5174', 'https://localhost:5173', 'http://localhost.evil.test:5173', 'http://127.0.0.1:5173/path']) assert.equal(isAuthorizedOrigin(origin, options), false)
})

test('configuração inválida não autoriza uma origem remota', () => {
  for (const origin of ['http://desktop.example.ts.net', remoteOrigin + '/', remoteOrigin + '/path', 'https://user@desktop.example.ts.net', 'invalid']) assert.equal(isAuthorizedOrigin(origin, { ...options, remoteOrigin: origin }), false)
})
