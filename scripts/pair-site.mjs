import { mkdir, writeFile } from 'node:fs/promises'
import { randomBytes, createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
if (process.stdin.isTTY) process.stdin.setRawMode(true)
console.log('Ready for pairing JSON on stdin (input is hidden).')
let input = ''; for await (const chunk of process.stdin) { input += chunk; if (/[\r\n]/.test(input)) break }
process.stdin.pause()
const config = JSON.parse(input)
const url = new URL(config.url)
if (url.protocol !== 'https:' || !url.hostname.endsWith('.chatgpt.site') || url.pathname !== '/' || !config.serviceToken) throw new Error('Configuração inválida.')
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.wendler')
await mkdir(dir, { recursive: true })
const secret = randomBytes(32).toString('hex')
const file = path.join(dir, 'remote.json')
await writeFile(file, JSON.stringify({ url: url.origin, serviceToken: config.serviceToken, secret }, null, 2), { mode: 0o600 })
if (process.platform === 'win32') {
  const account = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
  const result = spawnSync('icacls.exe', [file, '/inheritance:r', '/grant:r', `${account}:(F)`], { windowsHide: true, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('Não foi possível proteger a credencial local.')
}
console.log(JSON.stringify({ paired: true, hash: createHash('sha256').update(secret).digest('hex') }))
process.exit(0)
