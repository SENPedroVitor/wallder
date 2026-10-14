import { useState } from 'react'
import { CanvasScene, type SceneAction } from './CanvasScene'
import type { BackendRoutine, useRoutines } from './useRoutines'

type Props={api:ReturnType<typeof useRoutines>;onCreate:()=>void;onEdit:(r:BackendRoutine)=>void;onNotice:(message:string)=>void;onChat:(id:string)=>void;onBack:()=>void;profileName:string}
export default function RoutineList({api,onCreate,onEdit,onNotice,onChat,onBack,profileName}:Props){
 const [offset,setOffset]=useState(0),[history,setHistory]=useState(false),[monthOffset,setMonthOffset]=useState(0)
 const today=new Date(),monday=new Date(today.getFullYear(),today.getMonth(),today.getDate()-(today.getDay()+6)%7+offset*7)
 const days=Array.from({length:7},(_,i)=>new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i))
 const miniMonth=new Date(today.getFullYear(),today.getMonth()+monthOffset,1)
 const names=['segunda','terça','quarta','quinta','sexta','sábado','domingo']
 const bindings={
  'Período da semana':{text:days[0].getDate()+' – '+days[6].toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})},
  'Mês do mini calendário':{text:miniMonth.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})},
  'Pedro — nome':{text:profileName||'Seu perfil'},'Pedro — iniciais':{text:(profileName||'P').slice(0,2)},
  'Aviso — aprovação pendente':{text:api.pending?'Execução em andamento':''},
  'Agenda — visualização selecionada':{style:{left:history?'524px':'412px'}},
  ...Object.fromEntries(days.map((day,i)=>['Data da semana — '+(5+i),{text:String(day.getDate()),style:{'font-weight':day.toDateString()===today.toDateString()?'600':'400'}}])),
 }
 function decorate(root:HTMLElement){
  const children=[...root.children] as HTMLElement[]
  for(const n of children){const name=n.dataset.pencilName||'';if(/^(Resumo|Agenda|Atualizar Waddle|Pesquisa|Automação|Segurança) — \d+ —/.test(name)||/aguardando|aprovação|Solicitar/i.test(name)&&name!=='Aviso — aprovação pendente'||/Songbird aguarda aprovação/.test(n.textContent||''))n.remove()}
  const todayIndex=days.findIndex(day=>day.toDateString()===today.toDateString())
  const column=root.querySelector<HTMLElement>('[data-pencil-name="Quarta-feira — coluna de hoje"]'),circle=root.querySelector<HTMLElement>('[data-pencil-name="Hoje — dia 7"]')
  if(column){column.style.left=(244+Math.max(0,todayIndex)*76.5)+'px';column.style.display=todayIndex<0?'none':''}
  if(circle){circle.style.left=(268+Math.max(0,todayIndex)*76.5)+'px';circle.style.display=todayIndex<0?'none':''}
  for(const n of root.querySelectorAll<HTMLElement>('[data-pencil-name^="Cabeçalho —"]'))n.style.color='#999'
  root.querySelector<HTMLElement>('[data-pencil-name="Cabeçalho — '+names[todayIndex]+'"]')?.style.setProperty('color','#8e851e')
  const first=miniMonth,start=new Date(first.getFullYear(),first.getMonth(),1-first.getDay())
  const monthCircle=root.querySelector<HTMLElement>('[data-pencil-name="Dia 7 — selecionado no mês"]');if(monthCircle)monthCircle.style.display='none'
  root.querySelectorAll<HTMLElement>('[data-pencil-name^="Data do mini calendário "]').forEach((n,i)=>{const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);n.textContent=String(d.getDate());n.dataset.label='day:'+d.getTime();n.setAttribute('role','button');n.setAttribute('aria-label',d.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}));n.tabIndex=0;n.style.cursor='pointer';n.style.color=d.getMonth()===miniMonth.getMonth()?'#777':'#bbb';if(d.toDateString()===today.toDateString()){const dot=root.querySelector<HTMLElement>('[data-pencil-name="Dia 7 — selecionado no mês"]');if(dot){dot.style.display='';dot.style.left=(parseFloat(n.style.left)+2)+'px';dot.style.top=(parseFloat(n.style.top)-3)+'px'}}})
  const make=(label:string,action:string,style:string)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.label=action;b.dataset.actionName='routine-live';b.style.cssText=style;b.className='native-routine-action';root.append(b);return b}
  if(history){
   for(const n of [...root.children] as HTMLElement[])if(parseFloat(n.style.left)>=200&&parseFloat(n.style.top)>=107)n.remove()
   const list=document.createElement('div');list.style.cssText='position:absolute;left:220px;top:118px;width:560px;height:440px;overflow:auto;z-index:500';list.className='native-routine-history';root.append(list)
   for(const routine of api.routines){const row=document.createElement('div');row.className='native-routine-row';const heading=document.createElement('strong');heading.textContent=routine.name;const detail=document.createElement('small');detail.textContent=routine.agent.name+' · '+routine.frequency+' às '+routine.time+' · '+(routine.active?'Ativa':'Pausada');row.append(heading,detail);for(const [label,action] of [['Editar','edit:'],[routine.active?'Pausar':'Retomar','toggle:'],['Executar agora','run:']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.label=action+routine.id;b.dataset.actionName='routine-live';b.disabled=!!api.pending;row.append(b)}list.append(row)}
   for(const result of api.results.slice().reverse()){const row=document.createElement('button');row.type='button';row.className='native-routine-delivery';row.dataset.label='chat:'+result.chatId;row.dataset.actionName='routine-live';const date=document.createElement('small');date.textContent=new Date(result.at).toLocaleString('pt-BR');const text=document.createElement('span');text.textContent=result.status==='completed'?result.text:result.error||'A execução falhou';row.append(date,text);list.append(row)}
   if(!api.routines.length&&!api.results.length)list.textContent='As entregas aparecerão aqui depois de uma execução.'
  }else{
   const palette:Record<string,string>={west:'#f3f0ce',pam:'#f0e6de',songbird:'#eee8f7',indy:'#eee6df',sheldon:'#e5eff1',captain:'#e6ecf5'}
   days.forEach((_,i)=>api.routines.filter(r=>r.active&&(r.frequency==='Todos os dias'||r.frequency==='Dias úteis'&&i<5||r.frequency==='Toda segunda-feira'&&i===0)).forEach((r,j)=>{const [hour,minute]=r.time.split(':').map(Number),top=169+Math.max(0,Math.min(10.1,hour-7+minute/60))*36;const button=make(r.name+'\n'+r.agent.name+(r.active?'':' · Pausada'),'edit:'+r.id,'position:absolute;left:'+(248+i*76.5)+'px;top:'+(top+j*3)+'px;width:68.5px;min-height:32px;max-height:52px;border-radius:5px;background:'+(palette[r.agent.id]||'#eee8f7')+';font-size:8px;line-height:10px;padding:4px;text-align:left;display:block;overflow:hidden;white-space:pre-line;color:#444;z-index:'+(400+j)+';opacity:'+(r.active?1:.55));button.title=r.name+' · '+r.time}))
  }
 }
 async function action(a:SceneAction){const label=a.label.replace(/^\+\s*/,''),[kind,id]=label.split(':');const routine=api.routines.find(r=>r.id===id);if(label==='Nova rotina'){onCreate();return}if(/Voltar/.test(label)){onBack();return}if(label==='Histórico'){setHistory(true);return}if(label==='Agenda'){setHistory(false);return}if(label==='Semana anterior'){setOffset(n=>n-1);return}if(label==='Próxima semana'){setOffset(n=>n+1);return}if(label==='Mês anterior no mini calendário'){setMonthOffset(n=>n-1);return}if(label==='Próximo mês no mini calendário'){setMonthOffset(n=>n+1);return}if(kind==='day'){const d=new Date(Number(id)),currentMonday=new Date(today.getFullYear(),today.getMonth(),today.getDate()-(today.getDay()+6)%7),targetMonday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-(d.getDay()+6)%7);setOffset(Math.round((targetMonday.getTime()-currentMonday.getTime())/604800000));return}if(label==='Hoje'){setOffset(0);setMonthOffset(0);return}if(kind==='chat'){onChat(label.slice(5));return}if(!routine)return;if(kind==='edit'){onEdit(routine);return}try{if(kind==='toggle')await api.toggle(routine);if(kind==='run'){await api.run(routine.id);onNotice('Rotina executada. A resposta está na conversa.')}}catch(e){onNotice(e instanceof Error?e.message:'Não foi possível completar.')}
 }
 return <div className="waddle-scene-page"><CanvasScene id="I17fw" crop={false} bindings={bindings} decorate={decorate} decorationKey={JSON.stringify([api.routines,api.results,offset,monthOffset,history,api.pending])} onAction={a=>void action(a)}/>{api.error&&<p role="alert" className="waddle-error">{api.error}</p>}</div>
}
