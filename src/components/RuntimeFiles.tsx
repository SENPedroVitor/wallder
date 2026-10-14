import { useCallback, useEffect, useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { runtimeJson } from '../runtime'

export default function RuntimeFiles() {
  const [files, setFiles] = useState<{ name: string; path: string; size: number }[]>([])
  const [error, setError] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    setError('')
    try {
      const value = await runtimeJson<{ files: typeof files } | typeof files>('files', undefined, {signal})
      if (!signal?.aborted) setFiles(Array.isArray(value) ? value : value.files)
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Não foi possível ler a pasta.') }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    const timer = setInterval(() => void load(controller.signal), 5000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [load])
  return <section className="work-files"><h3>Arquivos produzidos pelos agentes</h3>
    <button className="outline-button" onClick={() => void load()}><RefreshCw size={14} /> Atualizar pasta</button>
    {files.map(file => <a key={file.path} href={`/api/files/content?path=${encodeURIComponent(file.path)}`} download={file.name}><FileText size={18} /><span>{file.path}<small>{Math.ceil(file.size / 1024)} KB · pasta de trabalho</small></span></a>)}
    {!files.length && <p className="work-muted">Os arquivos criados pelos agentes aparecem aqui automaticamente.</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>
}
