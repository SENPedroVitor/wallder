import { useState, type ChangeEvent } from 'react'
import { Download, Upload, RotateCcw, Check } from 'lucide-react'
import { backupCounts, captureBackup, downloadBackup, recoveryKey, restoreBackup, validateBackup, type Backup } from '../backup'
export default function BackupSettings({ agents }: { agents: string[] }) {
  const [pending, setPending] = useState<Backup | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [recover, setRecover] = useState(false)
  const [exported, setExported] = useState<Backup | null>(null)
  const recovery = localStorage.getItem(recoveryKey) !== null
  const counts = pending ? backupCounts(pending) : null
  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    setPending(null); setError(''); setRecover(false)
    try { if (file.size > 40_000_000) throw new Error('Escolha um backup de até 40 MB.'); setPending(validateBackup(JSON.parse(await file.text()), agents)) } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ler esse backup.') }
  }
  function exportData() { try { const backup = captureBackup(); setExported(backup); downloadBackup(backup); setError('') } catch { setError('Não foi possível exportar os dados.') } }
  async function restore() {
    if (!pending) return; setBusy(true)
    try { await restoreBackup(pending) } catch { setError('Não foi possível restaurar. O conteúdo anterior foi preservado. Verifique o espaço do navegador.'); setBusy(false) }
  }
  return <section id="backup" className="settings-section"><div className="section-head"><div><h2>Backup e restauração</h2><p>Leve suas conversas, arquivos locais, equipes e ajustes com você.</p></div></div><div className="backup-actions"><button className="outline-button" onClick={exportData}><Download size={16} /> Exportar backup</button><label className="outline-button backup-upload"><Upload size={16} /> Importar backup<input type="file" accept="application/json,.json" onChange={read} disabled={busy} /></label>{recovery && <button className="text-action" onClick={() => { try { setPending(validateBackup(JSON.parse(localStorage.getItem(recoveryKey)!), agents)); setRecover(true); setError('') } catch { setError('A cópia de recuperação não pôde ser lida.') } }}><RotateCcw size={15} /> Recuperar conteúdo anterior</button>}</div><p className="config-disclaimer">O arquivo fica no seu computador. Inclui os anexos salvos no chat. Antes de restaurar, guardamos uma cópia recuperável do conteúdo atual neste navegador.</p>{exported && <p className="backup-export-ready" role="status">Backup preparado. <a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exported, null, 2))}`} download={`wendler-${exported.created.slice(0,10)}.json`}>Baixar novamente o arquivo JSON</a></p>}{pending && counts && <div className="backup-preview" role="region" aria-label="Prévia do backup"><strong>{recover ? 'Recuperar conteúdo anterior' : 'Backup pronto para restaurar'}</strong><p>{counts.messages} mensagens · {counts.teams} equipes · {counts.tasks} tarefas</p><small>Salvo em {new Date(pending.created).toLocaleString('pt-BR')}. A restauração substitui o conteúdo atual e recarrega o site. Você pode desfazer pela cópia de recuperação.</small><div className="backup-actions"><button className="primary-button" disabled={busy} onClick={restore}><Check size={16} /> {busy ? 'Restaurando…' : 'Restaurar este backup'}</button><button className="outline-button" disabled={busy} onClick={() => setPending(null)}>Cancelar</button></div></div>}{error && <p className="field-error" role="alert">{error}</p>}</section>
}
