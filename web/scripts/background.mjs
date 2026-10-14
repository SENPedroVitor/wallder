import { spawn, spawnSync } from 'node:child_process'
import { mkdir, open, readFile, readdir, stat, unlink, writeFile, appendFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const data = path.join(project, '.wendler')
const logDir = path.join(data, 'logs')
await mkdir(logDir, { recursive: true })
const lock = path.join(data, 'background.pid')
try {
  const file = await open(lock, 'wx'); await file.writeFile(String(process.pid)); await file.close()
} catch {
  let alive = false
  try { process.kill(Number(await readFile(lock, 'utf8')), 0); alive = true } catch {}
  if (alive) process.exit(0)
  await unlink(lock).catch(() => {})
  const file = await open(lock, 'wx'); await file.writeFile(String(process.pid)); await file.close()
}

let closing = false
const children = new Map()
const writing = new Map()
function log(name, chunk) {
  const file = path.join(logDir, `${name}.log`)
  const queued = (writing.get(name) || Promise.resolve()).then(async () => {
    if ((await stat(file).catch(() => ({ size: 0 }))).size > 5_000_000) { await unlink(`${file}.previous`).catch(() => {}); await rename(file, `${file}.previous`) }
    await appendFile(file, `${chunk}`)
  }).catch(() => {})
  writing.set(name, queued)
}
async function codexBinary() {
  if (process.env.WENDLER_CODEX_BIN) return process.env.WENDLER_CODEX_BIN
  if (process.platform !== 'win32') return 'codex'
  const base = path.join(process.env.LOCALAPPDATA || '', 'OpenAI', 'Codex', 'bin')
  const entries = await readdir(base, { withFileTypes: true }).catch(() => [])
  const files = await Promise.all(entries.filter(entry => entry.isDirectory()).map(async entry => { const file = path.join(base, entry.name, 'codex.exe'); return { file, modified: (await stat(file).catch(() => ({ mtimeMs: 0 }))).mtimeMs } }))
  return files.filter(file => file.modified).sort((a, b) => b.modified - a.modified)[0]?.file || 'codex'
}
let network = {}
try { network = JSON.parse(await readFile(path.join(data, 'network.json'), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const tailscaleHost = process.env.WENDLER_TAILSCALE_HOST || network.tailscaleHost
if (tailscaleHost && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z0-9-]+\.ts\.net$/.test(tailscaleHost)) throw new Error('Nome do nó Tailscale inválido.')
const env = { ...process.env, WENDLER_CODEX_BIN: await codexBinary(), ...(tailscaleHost ? { WENDLER_TAILSCALE_HOST: tailscaleHost, WENDLER_REMOTE_ORIGIN: `https://${tailscaleHost}` } : {}) }
if (process.platform === 'win32') {
  const config = await readFile(path.join(data, 'autostart.json'), 'utf8').then(JSON.parse).catch(() => ({}))
  if (config.desktopExecutable && await stat(config.desktopExecutable).catch(() => null)) {
    const literal = `'${config.desktopExecutable.replaceAll("'", "''")}'`
    const started = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `if (-not (Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'" | Where-Object { $_.ExecutablePath -like '*OpenAI.Codex*' })) { Start-Process -FilePath ${literal} -WindowStyle Hidden }`], { windowsHide: true, encoding: 'utf8' })
    if (started.status !== 0) log('supervisor', 'Não foi possível iniciar o Codex desktop. Computer Use precisa do aplicativo aberto.\n')
  }
}
async function healthy(port, api) {
  try { const response = await fetch(`http://127.0.0.1:${port}${api ? '/api/status' : '/'}`, { signal: AbortSignal.timeout(3000) }); if (!response.ok) return false; if (api) { const value = await response.json(); return typeof value.ready === 'boolean' && typeof value.workspace === 'string' }; return (await response.text()).includes('Wendler') } catch { return false }
}
function launch(name, entry) {
  if (closing || children.has(name)) return
  const child = spawn(process.execPath, [path.join(project, entry)], { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true })
  children.set(name, child)
  log('supervisor', `${new Date().toISOString()} Iniciando ${name} (${child.pid}).\n`)
  child.stdout.on('data', chunk => log(name, chunk)); child.stderr.on('data', chunk => log(name, chunk))
  child.once('error', error => log(name, `${error.message}\n`))
  child.once('exit', code => { children.delete(name); log('supervisor', `${new Date().toISOString()} ${name} terminou (${code}).\n`) })
}
async function check() {
  if (closing) return
  if (!await healthy(Number(env.WENDLER_PORT || 5174), true)) launch('backend', 'server/index.mjs')
  if (!await healthy(Number(env.WENDLER_UI_PORT || 5173), false)) launch('interface', 'server/serve.mjs')
  // The remote connector is optional until the Site has been paired.
  if (env.WENDLER_SITE_BRIDGE === '1' && await stat(path.join(data, 'remote.json')).catch(() => null)) launch('remote', 'server/remote.mjs')
}
await check()
const timer = setInterval(() => void check().catch(error => log('supervisor', `${error.message}\n`)), 15000)
async function shutdown() {
  if (closing) return
  closing = true; clearInterval(timer)
  for (const child of children.values()) { if (child.connected) child.send('wendler:shutdown'); else child.kill() }
  setTimeout(() => { for (const child of children.values()) child.kill() }, 3500).unref()
  await unlink(lock).catch(() => {})
  setTimeout(() => process.exit(0), 4000).unref()
}
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown)
process.on('message', value => { if (value === 'wendler:shutdown') void shutdown() })
