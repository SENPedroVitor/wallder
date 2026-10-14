import { useEffect, useState } from 'react'
import { Plug, RefreshCw, Download } from 'lucide-react'
import { runtimeJson } from '../runtime'

type Status = { connected: boolean; sessions: { id: string; document: { name: string; page: string } }[] }
export function FigmaLocalConnection() {
  const [status,setStatus]=useState<Status>(),[pairing,setPairing]=useState<{code:string;expires:number}>(),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;async function refresh(){try{const value=await runtimeJson<Status>('figma-local/status',undefined,{signal:controller.signal});if(!controller.signal.aborted){setStatus(value);setError('')}}catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Ponte indisponível.')}finally{if(!controller.signal.aborted)timer=setTimeout(()=>void refresh(),3000)}}void refresh();return()=>{controller.abort();clearTimeout(timer)}},[])
  async function generate(){setBusy(true);try{setPairing(await runtimeJson('figma-local/pairing',{}));setError('')}catch(error){setError(error instanceof Error?error.message:'Não foi possível gerar o código.')}finally{setBusy(false)}}
  return <article className="connection-card figma-local-connection" aria-label="Figma local">
    <h3><Plug size={18}/> Figma local</h3>
    <p role="status">{status?.connected?'Arquivo conectado':status?'Ponte pronta · aguardando o plugin no Figma':'Consultando a ponte local…'}</p>
    {status?.sessions.map(session=><p key={session.id}>{session.document.name} · {session.document.page}</p>)}
    <p>Abra o Figma no computador, importe o plugin pelo arquivo manifest.json e execute “Wendler Local” no arquivo que quer editar.</p>
    <div className="connections-actions"><a href="/design/figma-local-plugin.zip" download><Download size={14}/> Baixar plugin</a><button disabled={busy} onClick={()=>void generate()}><RefreshCw size={14}/> Gerar código de conexão</button></div>
    {pairing&&<p>Código: <strong>{pairing.code}</strong> · válido por 10 minutos. Digite no plugin.</p>}
    <p className="connections-note">Mantenha o plugin aberto. Esta conexão não usa o MCP oficial nem a API REST do Figma.</p>
    {error&&<p className="connections-error" role="alert">{error}</p>}
  </article>
}
