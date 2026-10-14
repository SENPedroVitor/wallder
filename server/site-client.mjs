import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export async function siteConfig() {
  const config = JSON.parse(await readFile(path.join(project, '.wendler', 'remote.json'), 'utf8'))
  const url = new URL(config.url)
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.chatgpt.site') || url.pathname !== '/' || url.search || url.hash || url.username || url.password || !/^[a-f0-9]{64}$/.test(config.secret || '') || !config.serviceToken) throw new Error('Configuração do Site inválida.')
  return config
}
export async function siteFetch(config, pathname, options = {}) {
  if (!pathname.startsWith('/api/bridge/') || pathname.includes('..')) throw new Error('Rota remota inválida.')
  const response = await fetch(new URL(pathname, config.url), { ...options, redirect: 'error', headers: { ...options.headers, 'X-Wendler-Bridge': config.secret, 'OAI-Sites-Authorization': `Bearer ${config.serviceToken}` } })
  if (!response.ok && response.status !== 409) throw new Error(`O Site não respondeu (HTTP ${response.status}).`)
  return response
}
