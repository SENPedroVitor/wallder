import http from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {desktopAllowed,proxyDesktopRequest,proxyDesktopSocket} from './desktop-proxy.mjs'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = await realpath(path.join(project, 'dist'))
const port = Number(process.env.WENDLER_UI_PORT || 5173)
const backend = Number(process.env.WENDLER_PORT || 5174)
const tailscaleHost = process.env.WENDLER_TAILSCALE_HOST || ''
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' }
const server = http.createServer(async (req, res) => {
  const host = req.headers.host || ''
  const localHost = /^((127\.0\.0\.1|localhost|\[::1\]):\d+)$/.test(host)
  const remoteHost = tailscaleHost && (host === tailscaleHost || host === `${tailscaleHost}:443`)
  if (!localHost && !remoteHost) { res.writeHead(403); res.end(); return }
  if(req.url==='/computer'){res.writeHead(302,{Location:'/computer/'});res.end();return}
  if(req.url?.startsWith('/computer/')){if(!desktopAllowed(req,tailscaleHost)){res.writeHead(403);res.end();return}proxyDesktopRequest(req,res);return}
  if (req.url?.startsWith('/api/')) {
    const upstream = http.request({ hostname: '127.0.0.1', port: backend, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${backend}` } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res) })
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'O serviço do Wendler está iniciando. Tente novamente em instantes.' })) })
    req.pipe(upstream)
    res.on('close', () => upstream.destroy())
    return
  }
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return }
    const url = new URL(req.url, 'http://localhost')
    const name = decodeURIComponent(url.pathname)
    if (name.includes('\\') || name.includes('\0')) throw new Error('Invalid path')
    let target = path.resolve(root, `.${name === '/' ? '/index.html' : name}`)
    if (!target.startsWith(root + path.sep)) throw new Error('Outside root')
    try { target = await realpath(target); if (!(await stat(target)).isFile()) throw new Error('Not file') } catch { if (path.extname(name)) throw new Error('Missing asset'); target = path.join(root, 'index.html') }
    if (!target.startsWith(root + path.sep)) throw new Error('Outside root')
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : await readFile(target))
  } catch { res.writeHead(404); res.end('Não encontrado.') }
})
server.on('upgrade',(req,socket,head)=>{if(!req.url?.startsWith('/computer/')||!desktopAllowed(req,tailscaleHost)){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return}proxyDesktopSocket(req,socket,head)});
server.listen(port, '127.0.0.1', () => console.log(`Wendler: http://127.0.0.1:${port}`))
