import { useEffect, useState } from 'react'
import { RefreshCw, Cpu, FolderOpen, Database } from 'lucide-react'
import { runtimeJson, type RuntimeStatus } from '../runtime'
import './runtime.css'
import OpenCodeSettings from './OpenCodeSettings'

export default function RuntimeSettings({ status, refresh }: { status: RuntimeStatus; refresh: () => Promise<void> }) {
  const [models, setModels] = useState<{ id: string; name?: string; displayName?: string }[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!status.ready) return
    runtimeJson<{ models?: typeof models; data?: typeof models } | typeof models>('models')
      .then(value => setModels(Array.isArray(value) ? value : value.models ?? value.data ?? []))
      .catch(error => setError(error.message))
  }, [status.ready])
  async function changeModel(model: string) {
    setSaving(true); setError('')
    try { await runtimeJson('settings', { model }); await refresh() }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível trocar o modelo.') }
    finally { setSaving(false) }
  }
  return <section id="motor" className="settings-section runtime-settings">
    <h2><Cpu size={18} /> Motor de IA</h2>
    <OpenCodeSettings/>
    <p>{status.ready ? 'Codex conectado à sua sessão local. Novas mensagens usam IA real.' : status.error || 'Conectando ao serviço local…'}</p>
    <button className="outline-button" onClick={() => { setError(''); void refresh() }}><RefreshCw size={15} /> Verificar conexão</button>
    {status.model && <label>Modelo<select value={status.model} disabled={!models.length || saving} onChange={event => void changeModel(event.target.value)}>
      {!models.some(model => model.id === status.model) && <option value={status.model}>{status.model}</option>}
      {models.map(model => <option key={model.id} value={model.id}>{model.displayName || model.name || model.id}</option>)}
    </select></label>}
    {status.workspace && <p className="runtime-workspace"><FolderOpen size={16} /><span>Pasta de trabalho<br /><code>{status.workspace}</code></span></p>}
    <p>Conversar mantém os arquivos em leitura. “Criar tarefa” permite trabalhar nesta pasta. Ações que precisam de autorização aparecem no chat para você decidir.</p>
    <p><Database size={16} /> Conversas e preferências são sincronizadas com seu espaço privado. Agentes e rotinas executam no servidor conectado, mesmo com seu PC desligado.</p>
    <small>O painel Computador permite selecionar uma janela para usar Computer Use. As conexões externas disponíveis podem ser conferidas no painel Plugins. Rotinas executam enquanto o serviço local estiver ligado.</small>
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>
}
