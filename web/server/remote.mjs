import { siteConfig, siteFetch } from './site-client.mjs'
const config = await siteConfig()
const local = `http://127.0.0.1:${Number(process.env.WENDLER_PORT || 5174)}`
const active = new Map()
let closing = false
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function result(id, input) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const response = await siteFetch(config, '/api/bridge/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...input }), signal: AbortSignal.timeout(30000) }); return await response.json() }
    catch (error) { if (attempt === 2) throw error; await sleep(1000 * (attempt + 1)) }
  }
}
async function execute(job) {
  if (!/^[\w-]{36}$/.test(job.id || '') || !/^\/api\/(?!bridge|storage)/.test(job.path) || !['GET', 'POST'].includes(job.method) || job.path.includes('..') || job.path.includes('\\')) return
  const url = new URL(job.path, local)
  if (url.origin !== local) return
  const controller = new AbortController(); active.set(job.id, controller)
  try {
    const response = await fetch(url, { method: job.method, ...(job.method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: job.body } : {}), signal: controller.signal })
    const headers = Object.fromEntries(['content-type', 'content-disposition'].map(key => [key, response.headers.get(key)]).filter(([, value]) => value))
    await result(job.id, { phase: 'headers', code: response.status, headers })
    if (response.headers.get('content-type')?.includes('ndjson')) {
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let sequence = 0
      try {
        for (;;) { const { value, done } = await reader.read(); const chunk = decoder.decode(value, { stream: !done }); if (chunk) { const receipt = await result(job.id, { phase: 'chunk', seq: sequence++, chunk }); if (!receipt?.accepted) { controller.abort(); return } }; if (done) break }
      } finally { reader.releaseLock() }
      await result(job.id, { phase: 'done' })
    } else {
      const content = headers['content-type'] || ''
      // Download responses remain text-safe across JSON transport.
      if (!content.startsWith('application/json') && !content.startsWith('text/')) {
        const bytes = Buffer.from(await response.arrayBuffer())
        await result(job.id, { phase: 'done', body: bytes.toString('base64'), encoding: 'base64' })
      } else await result(job.id, { phase: 'done', body: await response.text() })
    }
  } catch (error) {
    if (!closing && error.name !== 'AbortError') {
      console.error('Pedido remoto:', error.message)
      await result(job.id, { phase: 'headers', code: 503, headers: { 'content-type': 'application/json' } }).then(() => result(job.id, { phase: 'done', body: JSON.stringify({ error: 'O computador interrompeu a conexão. Tente novamente.' }) })).catch(() => {})
    }
  } finally { active.delete(job.id) }
}
let lastError = ''
function stop() { closing = true; for (const controller of active.values()) controller.abort() }
process.once('SIGTERM', stop); process.once('SIGINT', stop); process.on('message', message => { if (message === 'wendler:shutdown') stop() })
while (!closing) {
  try {
    const status = await fetch(`${local}/api/status`, { signal: AbortSignal.timeout(5000) }).then(response => response.json()).catch(() => ({ ready: false, authenticated: false, error: 'O serviço do PC está iniciando.' }))
    const response = await siteFetch(config, '/api/bridge/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, active: [...active.keys()], capacity: Math.max(0, 8 - active.size) }), signal: AbortSignal.timeout(30000) })
    const payload = await response.json()
    for (const id of payload.cancelled || []) active.get(id)?.abort()
    if (payload.job && active.size < 8) void execute(payload.job)
    if (lastError) console.log('Conexão com o Site restabelecida.')
    lastError = ''
    await sleep(700)
  } catch (error) { if (lastError !== error.message) console.error('Conexão remota:', error.message); lastError = error.message; await sleep(10000) }
}
