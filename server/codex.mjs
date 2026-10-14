import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { homedir, platform } from 'node:os'

export async function resolveCodexBinary(bin = 'codex') {
  if (bin !== 'codex' || platform() !== 'win32') return bin
  const base = path.join(homedir(), 'AppData', 'Local', 'OpenAI', 'Codex', 'bin')
  const entries = await readdir(base, { withFileTypes: true }).catch(() => [])
  const candidates = await Promise.all(entries.filter(entry => entry.isDirectory()).map(async entry => {
    const file = path.join(base, entry.name, 'codex.exe')
    return { file, modified: await stat(file).then(info => info.mtimeMs).catch(() => 0) }
  }))
  return candidates.filter(candidate => candidate.modified).sort((a, b) => b.modified - a.modified)[0]?.file || bin
}

export class CodexClient extends EventEmitter {
  constructor({ bin = 'codex', spawnProcess = spawn } = {}) {
    super()
    this.bin = bin
    this.spawnProcess = spawnProcess
    this.pending = new Map()
    this.nextId = 1
    this.buffer = ''
    this.ready = false
    this.error = ''
  }

  async start() {
    if (this.ready) return
    if (this.starting) return this.starting
    this.starting = this.startProcess()
    try { return await this.starting } finally { this.starting = null }
  }

  async startProcess() {
    if (this.spawnProcess === spawn) this.bin = await resolveCodexBinary(this.bin)
    const child = this.spawnProcess(this.bin, ['app-server', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    this.process = child
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => this.receive(chunk))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => { this.lastDiagnostic = String(chunk).trim().slice(-1000) })
    child.on('error', error => this.stop(error))
    child.on('exit', code => this.stop(new Error(`Codex app-server exited (${code})`)))
    try {
      await this.request('initialize', { clientInfo: { name: 'wendler', version: '0.1.0' }, capabilities: { experimentalApi: true } })
      this.send({ method: 'initialized', params: {} })
      this.ready = true
      this.error = ''
    } catch (error) {
      this.error = error.message
      child.kill?.()
      this.stop(error)
      throw error
    }
  }

  stop(error) {
    this.ready = false
    this.error = error?.message || 'Codex app-server stopped'
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer)
      reject(new Error(this.error))
    }
    this.pending.clear()
    this.emit('stopped', this.error)
    this.process = null
  }

  send(message) {
    if (!this.process?.stdin?.writable) throw new Error('Codex app-server is unavailable')
    this.process.stdin.write(`${JSON.stringify(message)}\n`)
  }

  request(method, params = {}, timeoutMs = 30000) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} timed out`))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      try { this.send({ id, method, params }) }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error) }
    })
  }

  respond(id, result) { this.send({ id, result }) }
  respondError(id, message) { this.send({ id, error: { code: -32000, message } }) }

  receive(chunk) {
    this.buffer += chunk
    if (this.buffer.length > 16_000_000) { this.buffer = ''; this.error = 'Codex response exceeded buffer limit'; return }
    let end
    while ((end = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, end).trim()
      this.buffer = this.buffer.slice(end + 1)
      if (!line) continue
      let message
      try { message = JSON.parse(line) } catch { continue }
      if ('id' in message && !('method' in message)) {
        const pending = this.pending.get(message.id)
        if (!pending) continue
        clearTimeout(pending.timer)
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)))
        else pending.resolve(message.result)
      } else if ('method' in message) {
        this.emit('message', message)
      }
    }
  }
}
