import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installAppViewport } from '../src/viewport.ts'

function browser({ visual = true } = {}) {
  const document = new EventTarget()
  const properties = new Map()
  document.documentElement = { clientHeight: 844, dataset: {}, style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) } }
  document.activeElement = { matches: () => false }
  const window = new EventTarget()
  const viewport = visual ? Object.assign(new EventTarget(), { height: 844, offsetTop: 0, scale: 1 }) : null
  const frames = new Map()
  let id = 0
  Object.assign(window, { document, visualViewport: viewport, innerHeight: 844, requestAnimationFrame: fn => { frames.set(++id, fn); return id }, cancelAnimationFrame: id => frames.delete(id) })
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()) }
  return { window, document, viewport, properties, frames, flush }
}

test('keyboard resize and Safari pan keep app aligned, then restore on dismissal', () => {
  const b = browser()
  const dispose = installAppViewport(b.window)
  assert.equal(b.properties.get('--app-height'), '844px')
  b.document.activeElement = { matches: () => true }
  b.viewport.height = 390
  b.viewport.offsetTop = 210
  b.viewport.dispatchEvent(new Event('resize'))
  b.viewport.dispatchEvent(new Event('scroll'))
  assert.equal(b.frames.size, 1)
  b.flush()
  assert.equal(b.properties.get('--app-height'), '390px')
  assert.equal(b.properties.get('--app-offset-top'), '210px')
  assert.equal(b.document.documentElement.dataset.keyboard, 'open')
  b.viewport.offsetTop = 240
  b.viewport.dispatchEvent(new Event('scroll'))
  b.flush()
  assert.equal(b.properties.get('--app-offset-top'), '240px')
  // Some Safari versions briefly leave a stale offset after the viewport expands.
  b.viewport.height = 844
  b.viewport.dispatchEvent(new Event('resize'))
  b.flush()
  assert.equal(b.properties.get('--app-offset-top'), '0px')
  assert.equal(b.document.documentElement.dataset.keyboard, 'closed')
  dispose()
  b.viewport.dispatchEvent(new Event('scroll'))
  b.document.dispatchEvent(new Event('focusin'))
  assert.equal(b.frames.size, 0)
  assert.equal(b.properties.size, 0)
})

test('pinch zoom does not shrink the app or imitate an open keyboard', () => {
  const b = browser()
  b.viewport.scale = 2
  b.viewport.height = 422
  b.viewport.offsetTop = 90
  b.document.activeElement = { matches: () => true }
  const dispose = installAppViewport(b.window)
  assert.equal(b.properties.get('--app-height'), '844px')
  assert.equal(b.properties.get('--app-offset-top'), '0px')
  assert.equal(b.document.documentElement.dataset.keyboard, 'closed')
  dispose()
})

test('window resize fallback and disposal cancel queued updates', () => {
  const b = browser({ visual: false })
  const dispose = installAppViewport(b.window)
  b.window.innerHeight = 480
  b.window.dispatchEvent(new Event('resize'))
  b.flush()
  assert.equal(b.properties.get('--app-height'), '480px')
  b.window.dispatchEvent(new Event('resize'))
  dispose()
  assert.equal(b.frames.size, 0)
  assert.equal(b.properties.size, 0)
})
