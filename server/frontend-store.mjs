import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { siteConfig, siteFetch } from './site-client.mjs'
const localKeys = new Set(['waddle:records:v1'])
const allowed = new Set(['waddle:records:v1', 'wendler:frontend:v1', 'wendler:linked-mini-chats:v2', 'wendler:tasks:v1', 'wendler:context-links:v1', 'wendler:plugins:v1'])
let queue = Promise.resolve()
// Agent writes share the browser-save queue and advance its revision.
export function mutateLocalStore(dataDir, key, apply) {
  if (!localKeys.has(key)) throw new Error('Registro local inválido.')
  return mutateStore(dataDir, key, apply)
}
export function mutateWorkspaceStore(dataDir, apply) {
  if (process.env.WENDLER_SITE_BRIDGE === '1') throw Object.assign(new Error('O Android requer o armazenamento do servidor local.'), { status: 503 })
  return mutateStore(dataDir, 'wendler:frontend:v1', apply)
}
function mutateStore(dataDir, key, apply) {
  const operation = queue.catch(() => {}).then(async () => {
    const file = path.join(dataDir, 'frontend.json')
    const records = await readFile(file, 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return {}; throw error })
    const result = apply(structuredClone(records[key]?.value ?? (key === 'wendler:frontend:v1' ? {} : [])), records)
    records[key] = { revision: (records[key]?.revision || 0) + 1, value: result.value }
    await mkdir(dataDir, { recursive: true })
    const temporary = `${file}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(records), { mode: 0o600 })
    await rename(temporary, file)
    return result.output
  })
  queue = operation.then(() => {}, () => {})
  return operation
}
export async function frontendStore(req, url, dataDir) {
  const file = path.join(dataDir, 'frontend.json')
  const load = async () => { try { return JSON.parse(await readFile(file, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return {}; throw error } }
  const key = url.searchParams.get('key')
  const raw = req.method === 'POST' ? await readBody(req) : null
  const input = raw === null ? null : JSON.parse(raw)
  let config
  if (process.env.WENDLER_SITE_BRIDGE === '1') {
    try { config = await siteConfig() } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  if (config && !localKeys.has(key || input?.key)) {
    const response = await siteFetch(config, '/api/bridge/storage' + url.search, { method: req.method, ...(raw === null ? {} : { headers: { 'Content-Type': 'application/json' }, body: raw }), signal: AbortSignal.timeout(30000) })
    const value = await response.json()
    if (response.ok && req.method === 'GET' && !key) {
      await queue
      const local = await load()
      value.records = { ...value.records, ...Object.fromEntries(Object.entries(local).filter(([name]) => localKeys.has(name))) }
    }
    return { status: response.status, value }
  }
  if (req.method === 'GET') { await queue; const records = await load(); return { status: 200, value: { records: key ? (records[key] ? { [key]: records[key] } : {}) : records } } }
  if (req.method !== 'POST') return { status: 405, value: { error: 'Método não permitido.' } }
  if (!allowed.has(input.key) || !Number.isSafeInteger(input.revision) || input.revision < 0) return { status: 400, value: { error: 'Registro inválido.' } }
  const commit = async () => {
    const records = await load()
    if ((records[input.key]?.revision || 0) !== input.revision) return { status: 409, value: { error: 'O histórico foi atualizado em outro dispositivo.' } }
    records[input.key] = { revision: input.revision + 1, value: input.value }
    await mkdir(dataDir, { recursive: true })
    const temporary = `${file}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(records), { mode: 0o600 })
    await rename(temporary, file)
    return { status: 200, value: records[input.key] }
  }
  const next = queue.catch(() => {}).then(commit); queue = next.then(() => {})
  return next
}
async function readBody(req) { const chunks = []; let size = 0; for await (const chunk of req) { size += chunk.length; if (size > 30_000_000) throw Object.assign(new Error('Histórico muito grande.'), { status: 413 }); chunks.push(chunk) }; return Buffer.concat(chunks).toString('utf8') }
