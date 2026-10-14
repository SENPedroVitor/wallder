import { useState } from 'react'
import { CanvasScene, replaceCanvasMascot, type CanvasBinding } from './CanvasScene'
import { taskLabels, type ChatTask } from '../chatWork'

export function PencilTasksPanel({tasks,agents,current,chatId,onClose,onChat,onRetry,onBoard}:{tasks:ChatTask[];agents:{id:string;name:string}[];current:string;chatId?:string;onClose:()=>void;onChat:(id:string)=>void;onRetry:(task:ChatTask)=>void;onBoard:()=>void}){
 const [filter,setFilter]=useState('today')
 const shown=tasks.filter(task=>filter==='all'||filter==='team'&&(chatId?task.chatId===chatId:task.agent===current)||filter==='today'&&new Date(task.created).toDateString()===new Date().toDateString())
 const bindings:Record<string,CanvasBinding>={'Título do painel':{text:'Tarefas de hoje'},'Resumo das pendências':{text:shown.filter(t=>t.status!=='done').length+' pendentes · '+shown.filter(t=>t.status==='done').length+' concluídas'},'Fechar painel':{action:'Fechar painel'},'Filtro hoje':{action:'Hoje'},'Filtro equipe':{action:'Equipe'},'Filtro todas':{action:'Todas'},'Filtro hoje — selecionado':{style:{left:({today:24,team:118,all:212}[filter]??24)+'px'}},'Abrir quadro — texto':{action:'Abrir quadro de tarefas'}}
 return <aside className="pencil-tasks-panel" aria-label="Tarefas de hoje"><CanvasScene id="JX0gT" clip={{left:480,top:0,width:320,height:600}} crop={false} bindings={bindings} decorate={root=>{
  replaceCanvasMascot(root.querySelector<HTMLElement>('[data-pencil-name="Agente — painel"]'),current)
  const original=[...root.children] as HTMLElement[]
  const template=original.filter(node=>(node.dataset.pencilName||'').startsWith('Revisar a tela da agenda —')).map(node=>node.cloneNode(true) as HTMLElement)
  for(const node of original)if(/^(Revisar a tela da agenda|Implementar o perfil|Organizar prioridades) —|^Concluída|^Concluídas/.test(node.dataset.pencilName||''))node.remove()
  const list=document.createElement('div');list.className='pencil-panel-task-list';root.append(list)
  for(const task of shown){const card=document.createElement('button');card.className='pencil-panel-task';card.dataset.label='task:'+task.id;card.setAttribute('aria-label',task.title)
   for(const original of template){const node=original.cloneNode(true) as HTMLElement;node.style.left=(parseFloat(node.style.left)-20)+'px';node.style.top=(parseFloat(node.style.top)-160)+'px';const name=node.dataset.pencilName||'';if(name.endsWith('— título'))node.textContent=task.title;if(name.endsWith('— responsável'))node.textContent=(agents.find(a=>a.id===task.agent)?.name??task.agent)+' · '+new Date(task.updated).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});if(name.endsWith('— prioridade'))node.textContent=taskLabels[task.status];if(name.endsWith('— agente'))replaceCanvasMascot(node,task.agent);if(name.endsWith('— checkbox')){node.style.backgroundColor=task.status==='done'?'#E8D92F':'transparent';node.style.pointerEvents='none'}card.append(node)}list.append(card)
   if(task.status==='blocked'){const retry=document.createElement('button');retry.className='pencil-panel-retry';retry.dataset.label='retry:'+task.id;retry.textContent='Revisar e tentar novamente';list.append(retry)}
  }
  if(!shown.length){const empty=document.createElement('p');empty.textContent='Nenhuma tarefa nesta seleção.';list.append(empty)}
 }} decorationKey={JSON.stringify(shown)} onAction={event=>{if(event.label==='Fechar painel')onClose();else if(['Hoje','Equipe','Todas'].includes(event.label))setFilter(({Hoje:'today',Equipe:'team',Todas:'all'} as Record<string,string>)[event.label]);else if(event.label==='Abrir quadro de tarefas')onBoard();else if(event.label.startsWith('task:')){const task=tasks.find(t=>t.id===event.label.slice(5));if(task)onChat(task.chatId)}else if(event.label.startsWith('retry:')){const task=tasks.find(t=>t.id===event.label.slice(6));if(task)onRetry(task)}}}/></aside>
}
