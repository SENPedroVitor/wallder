import {useEffect,useState} from 'react'
import {runtimeJson} from '../runtime'
type Status={installed:boolean;connected:boolean;available:boolean;enabled:boolean;model:string;version?:string;error?:string}
type Auth={url:string;instructions:string;method:string}
export default function OpenCodeSettings(){
 const [status,setStatus]=useState<Status>(),[auth,setAuth]=useState<Auth>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;async function poll(){try{const value=await runtimeJson<Status>('opencode/status',undefined,{signal:controller.signal});if(!controller.signal.aborted)setStatus(value)}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Conexão indisponível.')}finally{if(!controller.signal.aborted)timer=setTimeout(()=>void poll(),5000)}}void poll();return()=>{controller.abort();clearTimeout(timer)}},[]);
 async function act(action:'login'|'complete'|'toggle'){setBusy(true);setError('');try{if(action==='login')setAuth(await runtimeJson<Auth>('opencode/auth',{}));else if(action==='complete'){setStatus(await runtimeJson<Status>('opencode/auth/complete',{}));setAuth(undefined)}else setStatus(await runtimeJson<Status>('opencode/settings',{enabled:!status?.enabled,model:status?.model||'openai/gpt-6-luna'}))}catch(e){setError(e instanceof Error?e.message:'Não foi possível configurar o OpenCode.')}finally{setBusy(false)}}
 return <section className="settings-section"><h3>OpenCode · consultas leves</h3><p role="status">{status?.installed?status.connected?'GPT conectado ao OpenCode':'OpenCode instalado · falta conectar GPT':'Verificando instalação do OpenCode'}</p><p>Clima pode usar OpenCode; tarefas complexas continuam no Codex. Esse caminho não envia histórico, memória ou anexos. GPT usa a franquia da sua conta ChatGPT.</p>
 <button className="outline-button" disabled={busy||!status?.installed} onClick={()=>void act('login')}>Conectar GPT ao OpenCode</button>
 {auth&&<div><p>{auth.instructions}</p><a href={auth.url} target="_blank" rel="noreferrer">Abrir login oficial</a><button className="outline-button" disabled={busy} onClick={()=>void act('complete')}>Concluí o login</button></div>}
 <button className="outline-button" aria-pressed={status?.enabled||false} disabled={busy||!status?.available} onClick={()=>void act('toggle')}>{status?.enabled?'Desativar OpenCode para clima':'Usar OpenCode para clima'}</button>
 {error&&<p role="alert" className="field-error">{error}</p>}
 </section>
}
