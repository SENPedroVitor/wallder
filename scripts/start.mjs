import { spawn } from 'node:child_process'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argument = name => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined }
const backendPort = argument('--backend-port') || process.env.WENDLER_PORT || '5174'
const interfacePort = argument('--ui-port') || process.env.WENDLER_UI_PORT || '5173'
if (![backendPort, interfacePort].every(value => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 65535) || backendPort === interfacePort) throw new Error('Portas locais inválidas.')
let network = {}
try { network = JSON.parse(await readFile(path.join(project, '.wendler', 'network.json'), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const tailscaleHost = argument('--tailscale-host') || process.env.WENDLER_TAILSCALE_HOST || network.tailscaleHost
if (tailscaleHost && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z0-9-]+\.ts\.net$/.test(tailscaleHost)) throw new Error('Nome do nó Tailscale inválido.')
const environment = {
  ...process.env,
  WENDLER_PORT: backendPort,
  WENDLER_UI_PORT: interfacePort,
  ...(tailscaleHost ? { WENDLER_TAILSCALE_HOST: tailscaleHost, WENDLER_REMOTE_ORIGIN: `https://${tailscaleHost}` } : {}),
}
const children = [
  spawn(process.execPath, [path.join(project, 'server', 'index.mjs')], { cwd: project, env: environment, stdio: ['inherit', 'inherit', 'inherit', 'ipc'], windowsHide: true }),
  spawn(process.execPath, [path.join(project, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1'], { cwd: project, env: environment, stdio: 'inherit', windowsHide: true }),
]

let closing = false
function shutdown() {
  if (closing) return
  closing = true
  if (children[0].exitCode === null && children[0].connected) children[0].send('wendler:shutdown')
  if (children[1].exitCode === null) children[1].kill()
  setTimeout(() => { for (const child of children) if (child.exitCode === null) child.kill() }, 3000).unref()
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, shutdown)
for (const child of children) child.once('exit', code => {
  if (!closing) { shutdown(); process.exitCode = code || 1 }
})
