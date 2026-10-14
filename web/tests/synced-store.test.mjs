import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeStores, syncMutation } from '../src/syncedStore.ts'

test('startup recovers an orphaned dirty records flag without hiding newer agent changes', async () => {
  const { initializeStores, refreshStores } = await import('../src/syncedStore.ts?dirty-record-recovery')
  const key = 'waddle:records:v1'
  const local = [{id:'project',kind:'projeto',updated:1,fields:{'wendler:project:v1':'{"tasks":[]}'}}]
  const cache = new Map([[key,JSON.stringify(local)],['wendler:unsaved:'+key,'true']])
  const previous = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, window: globalThis.window }
  globalThis.localStorage = { getItem:k=>cache.get(k)??null, setItem:(k,v)=>cache.set(k,v), removeItem:k=>cache.delete(k) }
  globalThis.window = new EventTarget()
  let record = {revision:2,value:[{...local[0],updated:2,fields:{'wendler:project:v1':'{"tasks":[{"id":"agent-task"}]}'}}]}
  globalThis.fetch = async (_url,options) => {
    if(options?.method==='POST') { const input=JSON.parse(options.body); assert.equal(input.revision,record.revision); record={revision:record.revision+1,value:input.value}; return Response.json(record) }
    return Response.json({records:{[key]:record}})
  }
  try {
    await initializeStores()
    assert.equal(cache.has('wendler:unsaved:'+key),false)
    assert.ok([...cache.keys()].some(k=>k.startsWith('wendler:records-recovery:')))
    assert.equal(JSON.parse(JSON.parse(cache.get(key))[0].fields['wendler:project:v1']).tasks[0].id,'agent-task')
    record={revision:4,value:[...record.value,{id:'next',updated:4}]}
    await refreshStores()
    assert.equal(JSON.parse(cache.get(key)).length,2)
  } finally { Object.assign(globalThis,previous) }
})

test('restored optional null stores remain absent and mutations use their default', async () => {
  const key = 'wendler:context-links:v1'
  const cache = new Map([[key, JSON.stringify({ obsolete: true })]])
  globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) }
  globalThis.window = new EventTarget()
  const records = { [key]: { revision: 2, value: null } }
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (options?.method === 'POST') {
      const input = JSON.parse(options.body)
      assert.equal(input.revision, 2)
      records[key] = { revision: 3, value: input.value }
      return Response.json(records[key])
    }
    return Response.json({ records })
  }
  try {
    await initializeStores()
    assert.equal(localStorage.getItem(key), null)
    const saved = await syncMutation(key, previous => { assert.deepEqual(Object.keys(previous), []); return { linked: true } }, () => ({}))
    assert.deepEqual(saved, { linked: true })
    assert.deepEqual(JSON.parse(localStorage.getItem(key)), { linked: true })
  } finally { globalThis.fetch = previousFetch }
})

test('an older deferred refresh cannot overwrite a newer mutation or roll revisions back', async () => {
  const { initializeStores, syncMutation, refreshStores } = await import('../src/syncedStore.ts?deferred-refresh')
  const key = 'wendler:frontend:v1'
  const cache = new Map()
  const previous = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, window: globalThis.window }
  globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) }
  globalThis.window = new EventTarget()
  let record = { revision: 1, value: { chats: [], selected: null } }
  let delayed = false, releaseRefresh
  let notifications = 0
  window.addEventListener(`wendler:store:${key}`, () => notifications++)
  globalThis.fetch = async (url, options) => {
    if (options?.method === 'POST') {
      const input = JSON.parse(options.body)
      assert.equal(input.revision, record.revision)
      record = { revision: record.revision + 1, value: input.value }
      return Response.json(record)
    }
    if (delayed && url === '/api/storage') {
      delayed = false
      const snapshot = structuredClone(record)
      return new Promise(resolve => { releaseRefresh = () => resolve(Response.json({ records: { [key]: snapshot } })) })
    }
    return Response.json({ records: { [key]: record } })
  }
  try {
    await initializeStores()
    delayed = true
    const refresh = refreshStores()
    assert.equal(typeof releaseRefresh, 'function')
    const value = { chats: [{ id: 'new-chat', messages: [{ text: 'Primeira mensagem' }] }], selected: 'new-chat' }
    await syncMutation(key, () => value, () => ({}))
    assert.equal(notifications, 1)
    releaseRefresh()
    await refresh
    assert.deepEqual(JSON.parse(cache.get(key)), value)
    assert.equal(notifications, 1, 'stale refresh must not notify or replace the selected chat')
    await refreshStores()
    assert.equal(notifications, 1, 'equal revision remains known after the stale refresh')
    record = { revision: 3, value: { ...value, selected: null } }
    await refreshStores()
    assert.deepEqual(JSON.parse(cache.get(key)), record.value)
    assert.equal(notifications, 2, 'a genuinely newer revision still refreshes')
  } finally {
    globalThis.fetch = previous.fetch
    globalThis.localStorage = previous.localStorage
    globalThis.window = previous.window
  }
})
