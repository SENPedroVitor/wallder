import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { permissionContent } from './mcp-approval.mjs'

export function createAutomationSettings(dataDir) {
  const file = path.join(dataDir, 'automation.json')
  let queue = Promise.resolve()
  async function read() {
    try {
      const value = JSON.parse(await readFile(file, 'utf8'))
      if (!['manual', 'automatic'].includes(value.mode)) throw new Error('Configuração de autonomia inválida.')
      return { mode: value.mode }
    } catch (error) { if (error.code === 'ENOENT') return { mode: 'manual' }; throw error }
  }
  async function save(value) {
    if (!value || Object.keys(value).some(key => key !== 'mode') || !['manual', 'automatic'].includes(value.mode)) throw new Error('Nível de autonomia inválido.')
    const operation = queue.then(async () => {
      await mkdir(dataDir, { recursive: true })
      const temp = `${file}.${randomUUID()}.tmp`
      await writeFile(temp, JSON.stringify({ mode: value.mode }), { mode: 0o600 })
      await rename(temp, file)
      return { mode: value.mode }
    })
    queue = operation.catch(() => {})
    return operation
  }
  return { read, save }
}

// Permission forms never supply missing credentials or bypass a high-risk review.
export function automaticMcpPermission(params) {
  const meta = params._meta ?? {}
  const risk = meta.riskLevel ?? meta.risk_level
  if (risk && !['low', 'medium'].includes(String(risk).toLowerCase())) return null
  const tool = String(meta.tool_name ?? meta.toolName ?? meta.tool ?? '')
  if (/payment|checkout|transfer|pix|purchase|purge|permanent|password|security|permission|grant_access|send_email|publish/i.test(tool)) return null
  if (!['form', 'openai/form', 'openaiForm'].includes(params.mode)) return null
  try { return permissionContent(params.requestedSchema) } catch { return null }
}
