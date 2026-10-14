import { useEffect, useRef, useState } from 'react'
import { Globe, Square, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react'
import { runtimeJson } from '../runtime'
import './BrowserPanel.css'

type BrowserStatus={remote?:boolean;desktopUrl?:string;active:boolean;visible:boolean;browser?:string;profileMode?:string;profileName?:string;url:string;owner?:string;title?:string;image?:string;session?:{expires:number;remaining:number}|null;lastError?:{url:string;message:string};events:{at:string;message:string}[]}
export default function BrowserPanel(){
  const [status,setStatus]=useState<BrowserStatus>(),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[profileMode,setProfileMode]=useState('dedicated')
  const mounted=useRef(false),generation=useRef(0),operation=useRef(false)
  useEffect(()=>{
    const controller=new AbortController()
    mounted.current=true
    let timer:ReturnType<typeof setTimeout>
    async function poll(){const current=generation.current;try{if(operation.current)return;const value=await runtimeJson<BrowserStatus>('browser/frame',undefined,{signal:controller.signal});if(!controller.signal.aborted&&current===generation.current)setStatus(value)}catch(e){if(!controller.signal.aborted&&current===generation.current)setError(e instanceof Error?e.message:'Navegador indisponível.')}finally{if(!controller.signal.aborted)timer=setTimeout(()=>void poll(),3000)}}
    void poll();return()=>{mounted.current=false;controller.abort();clearTimeout(timer)}
  },[])
  async function action(route:string,input:unknown={}){if(operation.current&&route!=='stop')return;operation.current=true;const current=++generation.current;setBusy(true);setError('');try{const value=await runtimeJson<BrowserStatus>('browser/'+route,input);if(mounted.current&&current===generation.current)setStatus(value)}catch(e){if(mounted.current&&current===generation.current)setError(e instanceof Error?e.message:'Não foi possível executar a ação.')}finally{if(current===generation.current){operation.current=false;if(mounted.current)setBusy(false)}}}
  return <section className="browser-panel">
    <div className="browser-heading"><Globe size={22}/><div><h2>Navegador dos agentes</h2><p>{status?.active?'Navegador conectado':'Inicie para os agentes acessarem sites de verdade.'}</p></div></div>
    <p>{status?.remote?"Os agentes compartilham o Firefox principal do servidor, com seus logins salvos. A atividade acontece no servidor e pode ser acompanhada pela prévia no chat.":"Os agentes usam o Firefox para abrir sites. O perfil guarda suas sessões; faça o login uma vez na janela visível."}</p>
    {!status?.active?<>{!status?.remote&&<><label>Perfil do Firefox<select aria-label="Perfil do Firefox" value={profileMode} onChange={e=>setProfileMode(e.target.value)}><option value="existing">Meu Firefox, com meus logins</option><option value="dedicated">Perfil separado do Wendler</option></select></label><p>Para usar seu perfil atual, feche as janelas do Firefox antes de iniciar.</p></>}<div className="browser-actions"><button className="outline-button" disabled={busy} onClick={()=>void action('start',{visible:true,browser:'firefox',profileMode})}><ExternalLink size={15}/>Abrir Firefox</button><button className="outline-button" disabled={busy} onClick={()=>void action('start',{visible:false,browser:'firefox',profileMode})}><Globe size={15}/>Iniciar em segundo plano</button></div></>:<>
      {status.desktopUrl&&<a className="outline-button" href={status.desktopUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Abrir Firefox no servidor</a>}
      <div className="browser-actions"><button className="outline-button" disabled={busy||!!status.owner} onClick={()=>void action('start',{visible:!status.visible,browser:status.browser||'firefox',profileMode:status.profileMode||'dedicated'})}><ExternalLink size={15}/>{status.visible?'Voltar ao segundo plano':'Abrir janela para entrar nas contas'}</button><span role="status">{status.visible?'Janela visível':'Em segundo plano'}</span></div><form className="browser-address" onSubmit={e=>{e.preventDefault();void action('open',{url})}}><label htmlFor="agent-browser-url">Endereço do site</label><div><input id="agent-browser-url" type="text" placeholder="https://site.com" required value={url} onChange={e=>setUrl(e.target.value)} disabled={busy||!!status.owner}/><button className="outline-button" disabled={busy||!!status.owner}>Abrir site</button></div></form>
      <fieldset className="browser-authorization"><legend><ShieldCheck size={15}/>Nível de automação</legend><button className="outline-button" aria-pressed={!status.session} disabled={busy} onClick={()=>void action('authorize',{mode:'manual'})}>Confirmar cada ação</button><button className="outline-button" aria-pressed={!!status.session} disabled={busy} onClick={()=>void action('authorize',{mode:'session'})}>Autorizar esta sessão por 15 minutos</button><p>{status.session?`Sessão autorizada · até ${status.session.remaining} ações · termina às ${new Date(status.session.expires).toLocaleTimeString('pt-BR')}`:'O agente pede sua confirmação no chat antes de clicar ou preencher.'} Compras, envios e dados pessoais continuam com revisão.</p></fieldset>
      <div className="browser-actions"><button className="outline-button" onClick={()=>void action('stop')}><Square size={14}/>Parar navegador e revogar acesso</button><button className="outline-button" disabled={busy} onClick={()=>{setError('');void runtimeJson<BrowserStatus>('browser/frame').then(setStatus).catch(e=>setError(e.message))}}><RefreshCw size={14}/>Atualizar página</button></div>
      <p className="browser-location">{status.url}{status.owner?' · Em uso por uma conversa':''}</p>
      {status.image&&<img className="browser-preview" src={status.image} alt={'Página atual: '+(status.title||status.url)}/>}
    </>}
    <p>Para compras, diga ao agente o produto e o orçamento. Ele pode pesquisar e preparar o carrinho; a finalização pede uma revisão com vendedor e total. O site pode pedir sua participação no login ou na confirmação do pagamento.</p>
    {status?.lastError&&<p role="alert" className="waddle-error">{status.lastError.message}</p>}{error&&<p role="alert" className="waddle-error">{error}</p>}
    {!!status?.events?.length&&<details><summary>Atividade do navegador</summary><ul>{status.events.map((event,i)=><li key={event.at+i}>{event.message}</li>)}</ul></details>}
  </section>
}
