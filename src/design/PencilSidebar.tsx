import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CanvasMascot, CanvasScene } from './CanvasScene'
import type { Workspace, Chat } from './workspace'
import type { MascotAgent } from '../components/Mascot'

type Agent={id:MascotAgent;name:string}
export function PencilSidebar({variant,data,agents,current,busy,menu,onMenu,onAgent,onNew,onSearch,onNavigate}:{variant:'empty'|'chat'|'widget';data:Workspace;agents:Agent[];current:MascotAgent;busy:Record<string,boolean>;menu:boolean;onMenu:()=>void;onAgent:(id:MascotAgent)=>void;onNew:()=>void;onSearch:()=>void;onNavigate:(label:string)=>void}){
 const [search,setSearch]=useState('')
 const id=variant==='empty'?'s8DdPp':variant==='widget'?'nARBK':'Cg59o',width=variant==='empty'?176:variant==='widget'?152:200
 const latest=(id:string):Chat|undefined=>data.chats.filter(c=>c.agent===id&&!c.archived).sort((a,b)=>b.updated-a.updated)[0]
 const navigation=['Seus agentes','Perfil','Conta','Aparência','Notificações','Privacidade','Permissões','Projetos','Rotinas','Meus registros','Meus favoritos','Memória dos agentes','Conexões','Plugins','Histórico e itens fixados','Buscar no seu espaço']
 return <aside className={'pencil-sidebar pencil-sidebar--'+variant} style={{width}} aria-label="Navegação"><CanvasScene id={id} crop={false} clip={{left:0,top:0,width,height:600}} bindings={{'Nome do usuário':{text:data.profile.name,action:'Perfil'},Perfil:{text:data.profile.name,action:'Perfil'},Usuário:{text:data.profile.name,action:'Perfil'},'Inicial do perfil':{text:data.profile.name.slice(0,1)},'Iniciais de Pedro':{text:data.profile.name.slice(0,2)},'Acesso a plugins':{action:'Plugins'},'Nova conversa':{action:'Nova conversa'},'Placeholder de busca':{text:''},'Estado da lista':{text:''}}} decorate={root=>{
  for(const node of [...root.children] as HTMLElement[]){const name=node.dataset.pencilName||'',y=parseFloat(node.style.top)||0;if(y>=65&&y<525&&(/(?:avatar da lista|— nome$|— horário|— prévia|— navegação|— nome na navegação|Conversa selecionada)/.test(name)||(variant==='empty'&&name==='Título do cabeçalho')||(variant==='empty'&&name==='West — conjunto de formas'&&y>65)))node.remove()}
  if(variant==='empty')root.querySelector('[data-pencil-id="wXmTc"]')?.remove()
  root.style.background='transparent'
  for(const node of [...root.children] as HTMLElement[]){const height=parseFloat(node.style.height)||0,width=parseFloat(node.style.width)||0;if((parseFloat(node.style.top)||0)>=525||(height>=590&&width<=220))node.remove()}
  const links=root.querySelector<HTMLElement>('[data-pencil-name="Links do espaço"]');if(links)links.remove()
  if(data.profile.avatar){const avatar=root.querySelector<HTMLElement>('[data-pencil-name="Avatar de Pedro"],[data-pencil-name="Avatar do perfil"]');if(avatar){avatar.style.backgroundImage='url("'+data.profile.avatar+'")';avatar.style.backgroundSize='cover';root.querySelector<HTMLElement>('[data-pencil-name="Inicial do perfil"],[data-pencil-name="Iniciais de Pedro"]')?.remove()}}
 }} decorationKey={data.profile.avatar} onAction={event=>{if(event.label==='Perfil')onMenu();else if(event.label==='Nova conversa')onNew();else if(event.label==='Buscar no seu espaço')onSearch();else onNavigate(event.label)}}/>
 <>{variant==='chat'&&<input className="pencil-sidebar-search" aria-label="Buscar agentes" placeholder="Buscar agentes" value={search} onChange={event=>setSearch(event.target.value)}/>}</>
 <div className="pencil-sidebar-agents">{data.sidebarAgents.filter(id=>!search||agents.find(a=>a.id===id)?.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(id=>{const agent=agents.find(a=>a.id===id);if(!agent)return null;const chat=latest(id);return <button key={id} onClick={()=>onAgent(id)} className={id===current?'selected':''}><CanvasMascot agent={id} photo={data.prefs[id]?.photo as string|undefined} color={data.prefs[id]?.color as string|undefined} size={variant==='widget'?22:26}/><span><strong>{agent.name}</strong>{variant==='chat'&&chat?.messages.length?<small>{chat.messages.at(-1)?.text.slice(0,37)}</small>:null}</span>{variant==='chat'&&chat?.messages.length?<time>{busy[chat.id]?'Agora':new Date(chat.updated).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time>:null}</button>})}</div>
 {variant==='widget'&&<nav className="pencil-sidebar-links">{['Projetos','Rotinas','Conexões'].map(label=><button key={label} onClick={()=>onNavigate(label)}>{label}</button>)}</nav>}
 {variant!=='chat'&&<button className="pencil-sidebar-new" aria-label="Nova conversa" onClick={onNew}><Plus size={14}/></button>}
 <button className="pencil-sidebar-profile" aria-label="Perfil" onClick={onMenu}>{data.profile.avatar?<img src={data.profile.avatar} alt="Foto da conta"/>:<CanvasMascot agent="west" size={26}/>}<span>{data.profile.name||'Visitante'}</span></button>
 {menu&&<div className="pencil-sidebar-menu" role="menu">{navigation.map(label=><button key={label} role="menuitem" onClick={()=>onNavigate(label)}>{label}</button>)}</div>}
 </aside>
}
