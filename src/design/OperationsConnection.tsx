import {useEffect,useState} from 'react';
import {ShieldCheck,Server,ShoppingBag} from 'lucide-react';
import {runtimeJson} from '../runtime';
import agents from './agent-personalities.json';
type Grant={origin:string;agentId:string};
type Health={ok:boolean;diskAvailableBytes:number;backup:{verified:boolean;createdAt?:string;files?:number}|null};
type Order={orderId:string;item:string;merchant:string;status:string;checkedAt:string};
const states:Record<string,string>={pending:'Pendente',paid:'Pago',shipped:'Enviado',delivered:'Entregue',cancelled:'Cancelado'};
export function OperationsConnection(){
 const [grants,setGrants]=useState<Grant[]>([]),[health,setHealth]=useState<Health>(),[orders,setOrders]=useState<Order[]>([]),[origin,setOrigin]=useState(''),[agentId,setAgentId]=useState('pam'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function refresh(signal?:AbortSignal){const [policy,health,shopping]=await Promise.all([runtimeJson<{grants:Grant[]}>('service-policy',undefined,{signal}),runtimeJson<Health>('health',undefined,{signal}),runtimeJson<{orders:Order[]}>('shopping',undefined,{signal})]);if(!signal?.aborted){setGrants(policy.grants);setHealth(health);setOrders(shopping.orders)}}
 useEffect(()=>{const controller=new AbortController();void refresh(controller.signal).catch(error=>{if(!controller.signal.aborted)setError(error.message)});return ()=>controller.abort()},[]);
 async function grant(origin:string,agentId:string,enabled:boolean){setBusy(true);setError('');try{const result=await runtimeJson<{grants:Grant[]}>('service-policy',{origin,agentId,enabled});setGrants(result.grants)}catch(error){setError(error instanceof Error?error.message:'Não foi possível salvar.')}finally{setBusy(false)}}
 return <>
  <article className="connection-card" aria-label="Permissões por serviço"><h3><ShieldCheck size={18}/> Permissões por serviço</h3><p>Autorizações salvas para pesquisa e ações comuns no navegador. Dados pessoais, termos e pagamentos seguem suas revisões próprias.</p>
   <form onSubmit={event=>{event.preventDefault();void grant(origin,agentId,true)}}><label>Site HTTPS<input type="url" required value={origin} placeholder="https://www.nuuvem.com" onChange={event=>setOrigin(event.target.value)}/></label><label>Agente<select value={agentId} onChange={event=>setAgentId(event.target.value)}><option value="*">Todos os agentes</option>{agents.map(agent=><option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label><button disabled={busy}>Salvar autorização</button></form>
   {grants.map(grant=><p key={grant.origin+grant.agentId}>{grant.origin} · {grant.agentId==='*'?'Todos os agentes':agents.find(agent=>agent.id===grant.agentId)?.name||grant.agentId} <button disabled={busy} onClick={()=>void grantAction(grant)}>Revogar</button></p>)}
  </article>
  <article className="connection-card" aria-label="Servidor e backups"><h3><Server size={18}/> Servidor e backups</h3><p>{health?.ok?'Servidor respondendo':'Consultando servidor'}{health?` · ${(health.diskAvailableBytes/1024**3).toFixed(1)} GB livres`:''}</p><p>{health?.backup?.verified?`Backup verificado em ${new Date(health.backup.createdAt!).toLocaleString('pt-BR')}`:'Ainda sem backup verificado.'}</p><p>Backups criptografados de configurações e conversas a cada seis horas, com oito cópias locais. Não incluem o perfil do Firefox nem a chave do cofre.</p><button disabled={busy} onClick={()=>{setBusy(true);void runtimeJson('maintenance/backup',{}).then(()=>refresh()).catch(error=>setError(error.message)).finally(()=>setBusy(false))}}>Criar backup agora</button></article>
  <article className="connection-card" aria-label="Acompanhamento de pedidos"><h3><ShoppingBag size={18}/> Acompanhamento de pedidos</h3><p>Último estado observado pelos agentes. Consulte a loja para atualizar.</p>{orders.length?orders.map(order=><p key={order.merchant+order.orderId}>{order.item} · {order.merchant} · {states[order.status]||order.status} · {new Date(order.checkedAt).toLocaleString('pt-BR')}</p>):<p>Nenhum pedido registrado.</p>}</article>
  {error&&<p role="alert" className="connections-error">{error}</p>}
 </>;
 function grantAction(value:Grant){return grant(value.origin,value.agentId,false)}
}
