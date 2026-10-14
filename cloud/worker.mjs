const encoder = new TextEncoder()
const allowedKeys = new Set(['wendler:frontend:v1', 'wendler:linked-mini-chats:v2', 'wendler:tasks:v1', 'wendler:context-links:v1', 'wendler:plugins:v1'])
const getRoutes = new Set(['/api/models', '/api/files', '/api/files/content', '/api/computer/status', '/api/computer/apps', '/api/computer/frame', '/api/routines', '/api/routines/results'])
const postRoutes = new Set(['/api/chat', '/api/cancel', '/api/approvals', '/api/settings', '/api/computer/select', '/api/computer/stop', '/api/computer/approval', '/api/computer/test', '/api/routines', '/api/routines/run', '/api/routines/toggle', '/api/routines/delete'])
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function body(request, max = 2_000_000) { if (Number(request.headers.get('content-length')) > max) throw new Error('Pedido muito grande.'); const raw = await request.text(); if (encoder.encode(raw).length > max) throw new Error('Pedido muito grande.'); return raw }
const first = (env, sql, ...values) => env.DB.prepare(sql).bind(...values).first()
const run = (env, sql, ...values) => env.DB.prepare(sql).bind(...values).run()
async function service(request, env) {
  const token = request.headers.get('X-Wendler-Bridge') || ''
  if (!env.BRIDGE_SECRET_HASH || token.length !== 64) return false
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token)))].map(x => x.toString(16).padStart(2, '0')).join('')
  return hash === env.BRIDGE_SECRET_HASH
}
async function storage(request, env, url) {
  const key = url.searchParams.get('key')
  if (request.method === 'GET') {
    const rows = key ? { results: [await first(env, 'SELECT * FROM records WHERE key = ?', key)].filter(Boolean) } : await env.DB.prepare('SELECT * FROM records').all()
    const records = {}
    for (const row of rows.results) { const blob = await env.BUCKET.get(row.blob); if (!blob) throw new Error('Histórico temporariamente indisponível.'); records[row.key] = { revision: row.revision, value: JSON.parse(await blob.text()) } }
    return json({ records })
  }
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  const input = JSON.parse(await body(request, 30_000_000))
  if (!allowedKeys.has(input.key) || !Number.isSafeInteger(input.revision) || input.revision < 0) return json({ error: 'Registro inválido.' }, 400)
  const blobKey = `records/${crypto.randomUUID()}.json`
  const previous = await first(env, 'SELECT * FROM records WHERE key = ?', input.key)
  const revision = input.revision + 1
  await env.BUCKET.put(blobKey, JSON.stringify(input.value), { httpMetadata: { contentType: 'application/json' } })
  const saved = input.revision === 0 ? await run(env, 'INSERT INTO records (key,revision,blob) VALUES (?,?,?) ON CONFLICT(key) DO NOTHING', input.key, revision, blobKey) : await run(env, 'UPDATE records SET revision = ?, blob = ? WHERE key = ? AND revision = ?', revision, blobKey, input.key, input.revision)
  if (!saved.meta.changes) { await env.BUCKET.delete(blobKey); return json({ error: 'O histórico mudou em outro dispositivo. Atualize e tente novamente.' }, 409) }
  if (previous) await env.BUCKET.delete(previous.blob)
  return json({ revision, value: input.value })
}
async function connector(request, env, url) {
  if (!await service(request, env)) return json({ error: 'Conexão do computador não autorizada.' }, 401)
  if (url.pathname === '/api/bridge/storage') return storage(request, env, url)
  if (url.pathname === '/api/bridge/poll' && request.method === 'POST') {
    const input = JSON.parse(await body(request, 10000))
    const cancelled = []
    for (const id of (Array.isArray(input.active) ? input.active : []).slice(0, 8)) { const state = await first(env, 'SELECT status FROM jobs WHERE id = ?', String(id)); if (!state || state.status === 'cancelled') cancelled.push(id) }
    await run(env, 'INSERT INTO bridge (id,heartbeat,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET heartbeat = excluded.heartbeat, status = excluded.status', 'pc', Date.now(), JSON.stringify(input.status || {}))
    const gc = await first(env, "SELECT heartbeat FROM bridge WHERE id = 'gc'")
    if (!gc || gc.heartbeat < Date.now() - 60000) {
      const stale = await env.DB.prepare('SELECT id,response,request FROM jobs WHERE created < ? LIMIT 100').bind(Date.now() - 15 * 60000).all()
      for (const row of stale.results) { if (row.response) await env.BUCKET.delete(row.response); if (row.request) await env.BUCKET.delete(row.request); await env.DB.batch([env.DB.prepare('DELETE FROM chunks WHERE job = ?').bind(row.id), env.DB.prepare('DELETE FROM jobs WHERE id = ?').bind(row.id)]) }
      await run(env, 'INSERT INTO bridge (id,heartbeat,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET heartbeat = excluded.heartbeat', 'gc', Date.now(), '{}')
    }
    if (!input.capacity) return json({ job: null, cancelled })
    const job = await first(env, "SELECT * FROM jobs WHERE status = 'pending' AND created > ? ORDER BY created LIMIT 1", Date.now() - 60000)
    if (!job) return json({ job: null, cancelled })
    const claimed = await run(env, "UPDATE jobs SET status = 'running' WHERE id = ? AND status = 'pending'", job.id)
    const requestBody = claimed.meta.changes && job.request ? await env.BUCKET.get(job.request) : null
    return json({ job: claimed.meta.changes ? { id: job.id, method: job.method, path: job.path, body: requestBody ? await requestBody.text() : '' } : null, cancelled })
  }
  if (url.pathname === '/api/bridge/result' && request.method === 'POST') {
    const input = JSON.parse(await body(request, 20_000_000))
    if (!/^[\w-]{36}$/.test(input.id || '')) return json({ error: 'Pedido inválido.' }, 400)
    const job = await first(env, 'SELECT * FROM jobs WHERE id = ?', input.id)
    if (!job || job.created < Date.now() - 15 * 60000 || ['done', 'cancelled'].includes(job.status)) return json({ accepted: false })
    if (input.phase === 'headers') {
      if (!Number.isInteger(input.code) || input.code < 200 || input.code > 599) return json({ error: 'Resposta inválida.' }, 400)
      await run(env, 'UPDATE jobs SET code = ?, headers = ? WHERE id = ?', input.code, JSON.stringify(input.headers || {}), input.id)
    } else if (input.phase === 'chunk') {
      if (!Number.isInteger(input.seq) || input.seq < 0 || typeof input.chunk !== 'string' || input.chunk.length > 600000) return json({ error: 'Trecho inválido.' }, 400)
      await run(env, 'INSERT INTO chunks (id,job,seq,payload) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING', `${input.id}:${input.seq}`, input.id, input.seq, input.chunk)
    } else if (input.phase === 'done') {
      if (input.body !== undefined) { await env.BUCKET.put(`responses/${input.id}`, input.encoding === 'base64' ? Uint8Array.from(atob(input.body), char => char.charCodeAt(0)) : input.body); await run(env, 'UPDATE jobs SET response = ? WHERE id = ?', `responses/${input.id}`, input.id) }
      await run(env, "UPDATE jobs SET status = 'done' WHERE id = ?", input.id)
    } else return json({ error: 'Resposta inválida.' }, 400)
    return json({ accepted: true })
  }
  return json({ error: 'Rota não encontrada.' }, 404)
}
async function relay(request, env, url, ctx) {
  const pc = await first(env, "SELECT * FROM bridge WHERE id = 'pc'")
  const online = !!pc && pc.heartbeat > Date.now() - 20000
  if (url.pathname === '/api/status') return json({ ...(online ? JSON.parse(pc.status) : { ready: false, authenticated: false, model: '', workspace: '' }), online, remote: true, ...(!online ? { error: 'Seu computador está offline. Ligue o PC e entre no Windows para conversar com os agentes.' } : {}) })
  if (!online) return json({ error: 'Seu computador está offline. O histórico continua disponível.' }, 503)
  if (!(request.method === 'GET' ? getRoutes : postRoutes).has(url.pathname) || !['GET', 'POST'].includes(request.method)) return json({ error: 'Rota não permitida.' }, 404)
  const id = crypto.randomUUID()
  const requestBlob = request.method === 'POST' ? `requests/${id}` : ''
  if (requestBlob) await env.BUCKET.put(requestBlob, await body(request))
  await run(env, 'INSERT INTO jobs (id,method,path,request,created,status) VALUES (?,?,?,?,?,?)', id, request.method, url.pathname + url.search, requestBlob, Date.now(), 'pending')
  const deadline = Date.now() + 12 * 60000
  let job
  for (let i = 0; i < 120; i++) { job = await first(env, 'SELECT * FROM jobs WHERE id = ?', id); if (job?.code) break; if (request.signal.aborted) break; await sleep(500) }
  if (!job?.code) { await run(env, "UPDATE jobs SET status = 'cancelled' WHERE id = ?", id); return json({ error: 'O computador não respondeu. Tente novamente.' }, 504) }
  const headers = JSON.parse(job.headers || '{}')
  const contentType = headers['content-type'] || 'application/json'
  if (contentType.includes('ndjson')) {
    let sequence = 0
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (Date.now() < deadline && !request.signal.aborted) {
            const rows = await env.DB.prepare('SELECT * FROM chunks WHERE job = ? AND seq >= ? ORDER BY seq').bind(id, sequence).all()
            for (const row of rows.results) { if (row.seq !== sequence) break; controller.enqueue(encoder.encode(row.payload)); sequence++ }
            const state = await first(env, 'SELECT status FROM jobs WHERE id = ?', id)
            if (state?.status === 'done' && !rows.results.length) { controller.close(); return }
            await sleep(600)
          }
          await run(env, "UPDATE jobs SET status = 'cancelled' WHERE id = ? AND status != 'done'", id)
          controller.error(new Error('Conexão interrompida.'))
        } catch (error) { await run(env, "UPDATE jobs SET status = 'cancelled' WHERE id = ? AND status != 'done'", id).catch(() => {}); controller.error(error) }
      },
      cancel() { ctx.waitUntil(run(env, "UPDATE jobs SET status = 'cancelled' WHERE id = ? AND status != 'done'", id)) },
    })
    return new Response(stream, { status: job.code, headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store' } })
  }
  while (job.status !== 'done' && Date.now() < deadline && !request.signal.aborted) { await sleep(500); job = await first(env, 'SELECT * FROM jobs WHERE id = ?', id) }
  if (job.status !== 'done') { await run(env, "UPDATE jobs SET status = 'cancelled' WHERE id = ?", id); return json({ error: 'O computador não concluiu o pedido.' }, 504) }
  const result = job.response ? await env.BUCKET.get(job.response) : null
  const responseHeaders = { 'Content-Type': contentType, 'Cache-Control': 'no-store' }
  if (headers['content-disposition']) responseHeaders['Content-Disposition'] = headers['content-disposition']
  return new Response(result ? result.body : '', { status: job.code, headers: responseHeaders })
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    try {
      if (url.pathname.startsWith('/api/bridge/')) return await connector(request, env, url)
      if (!request.headers.get('oai-authenticated-user-id')) { if (url.pathname.startsWith('/api/')) return json({ error: 'Entre com sua conta para acessar o Wendler.' }, 401); return Response.redirect(`${url.origin}/signin-with-chatgpt?return_to=${encodeURIComponent(url.pathname + url.search)}`, 302) }
      if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: 'Origem não autorizada.' }, 403)
      if (request.headers.get('sec-fetch-site') === 'cross-site' && request.method !== 'GET') return json({ error: 'Origem não autorizada.' }, 403)
      if (url.pathname === '/api/storage') return await storage(request, env, url)
      if (url.pathname.startsWith('/api/')) return await relay(request, env, url, ctx)
      return env.ASSETS.fetch(request)
    } catch (error) { console.error('Wendler:', url.pathname, error.message); return json({ error: 'Não foi possível completar o pedido. Seus dados foram preservados.' }, 500) }
  },
}
