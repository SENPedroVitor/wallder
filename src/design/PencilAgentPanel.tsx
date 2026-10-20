import { useEffect, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { CanvasScene, type CanvasBinding } from './CanvasScene'
import { runtimeJson } from '../runtime'
import type { BackendRoutine } from './useRoutines'

export function PencilAgentPanel({name,agentId,conversationId,routines,onClose,onSettings,onRoutine}:{name:string;agentId:string;conversationId?:string;routines:BackendRoutine[];onClose:()=>void;onSettings:()=>void;onRoutine:(routine:BackendRoutine)=>void}){
 const [frame,setFrame]=useState<{active:boolean;conversationId?:string;image?:string;title?:string;protected?:boolean;desktopUrl?:string}>(),[expanded,setExpanded]=useState(false)
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{setFrame(undefined);setExpanded(false);const id=conversationId;if(!id)return;const endpoint='browser/monitor?conversationId='+encodeURIComponent(id);const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;async function refresh(){try{const value=await runtimeJson<typeof frame>(endpoint,undefined,{signal:controller.signal});if(!controller.signal.aborted)setFrame(value?.conversationId===conversationId?value:undefined)}catch{if(!controller.signal.aborted)setFrame(undefined)}finally{if(!controller.signal.aborted)timer=setTimeout(()=>void refresh(),2000)}}void refresh();return()=>{controller.abort();clearTimeout(timer)}},[conversationId])
 useEffect(()=>{if(expanded)dialog.current?.showModal()},[expanded])
 const bindings:Record<string,CanvasBinding>={
  'Prévia da tela do agente':{style:{'background-image':frame?.image?'url("'+frame.image+'")':'none','background-size':'contain','background-position':'center','background-repeat':'no-repeat','background-color':'light-dark(#F5F5F5,var(--w-side))'},action:'Abrir navegador'},
  'Legenda da tela':{text:frame?.protected?'Formulário protegido':frame?.active?'Firefox do servidor':'Nenhuma tela nesta conversa',action:'Abrir navegador'},
  'Configurações do agente':{action:'Personalizar agente'},'Fechar painel':{action:'Fechar painel'},'Recolher painel':{action:'Fechar painel'},
 }
 const actual=routines.filter(r=>r.agent.id===agentId)
 return <aside className="pencil-agent-panel" aria-label={'Painel de '+name}><CanvasScene id="Cg59o" clip={{left:530,top:0,width:270,height:600}} crop={false} bindings={bindings} decorate={root=>{
  const names=['Estado —','Rotina —','Frequência —']
  for(const child of [...root.children] as HTMLElement[])if(names.some(prefix=>(child.dataset.pencilName||'').startsWith(prefix)))child.remove()
  const list=document.createElement('div');list.className='pencil-panel-routines';root.append(list)
  for(const routine of actual){const button=document.createElement('button');button.dataset.label='routine:'+routine.id;const title=document.createElement('strong'),frequency=document.createElement('small');title.textContent=routine.name;frequency.textContent=routine.active?routine.frequency+' às '+routine.time:'Pausada';button.append(title,frequency);list.append(button)}
  if(!actual.length){const empty=document.createElement('p');empty.textContent='Nenhuma rotina para este agente.';list.append(empty)}
 }} decorationKey={JSON.stringify(actual)} onAction={event=>{if(event.label==='Fechar painel')onClose();else if(event.label==='Personalizar agente')onSettings();else if(event.label==='Abrir navegador'){if(frame?.active)setExpanded(true)}else if(event.label.startsWith('routine:')){const routine=actual.find(r=>r.id===event.label.slice(8));if(routine)onRoutine(routine)}}}/>
 {expanded&&<dialog ref={dialog} className="computer-overlay" aria-label="Firefox do servidor" onCancel={()=>setExpanded(false)} onClose={()=>setExpanded(false)}><header><span>{frame?.title||'Firefox do servidor'}</span><button autoFocus className="icon-button" aria-label="Fechar prévia" onClick={()=>setExpanded(false)}><X size={20}/></button></header>{frame?.image?<img src={frame.image} alt="Prévia atual do Firefox no servidor"/>:<p>{frame?.protected?'A prévia fica oculta neste formulário para proteger seus dados.':'Aguardando a próxima captura.'}</p>}{frame?.desktopUrl&&<a className="outline-button" href={frame.desktopUrl} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Abrir tela interativa</a>}</dialog>}
 </aside>
}
