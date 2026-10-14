import { CanvasScene, type CanvasBinding } from './CanvasScene'
import type { RecordEntry } from './workspace'

const layouts:Record<string,{id:string;title:string;fields:Record<string,string>}>={
 gasto:{id:'VQ3BI',title:'Conferir gasto',fields:{Destinatário:'Destinatário',Valor:'Valor',Descrição:'title',Categoria:'Categoria','Conta de origem':'Conta de origem',Data:'Data'}},
 favorito:{id:'YEgH4',title:'Adicionar ou editar favorito',fields:{'Tipo de favorito':'Categoria','Modalidade / liga':'Modalidade','Time, artista ou série':'title'}},
 cartao:{id:'X5W7Tb',title:'Editar cartão',fields:{Nome:'title',Banco:'Banco','Últimos 4 dígitos':'Últimos quatro dígitos','Limite total':'Limite',Fechamento:'Dia de fechamento',Vencimento:'Dia de vencimento'}},
 investimento:{id:'xsiex',title:'Editar investimento',fields:{'Nome / emissor':'title',Tipo:'Tipo','Capital aplicado':'Valor','Saldo atual':'Saldo atual',Aplicação:'Data',Vencimento:'Vencimento'}},
 evento:{id:'RbbJM',title:'Editar evento ou lembrete',fields:{Evento:'title',Tipo:'Tipo',Data:'Data',Antecedência:'Antecedência'}},
 aniversario:{id:'WMRG0',title:'Cadastrar aniversário',fields:{Nome:'title',Relação:'Relação','Dia e mês':'Data','Lembrar antes':'Antecedência'}},
 pix:{id:'NnWRc',title:'Cadastrar chave Pix',fields:{'Banco / conta':'Banco','Nome da conta':'title','Tipo de chave':'Tipo da chave','Chave Pix':'Chave'}},
 memoria:{id:'uqK6F',title:'Editar memória',fields:{Informação:'Conteúdo','Compartilhar com':'Agente',Tipo:'Tipo'}},
}
export const hasPencilRecordEditor=(kind:string)=>!!layouts[kind]
export function PencilRecordEditor({record,error,onSave,onCancel,onExtras,onDraft,isNew=false,agents=[]}:{agents?:{id:string;name:string}[];isNew?:boolean;record:RecordEntry;error:string;onSave:(record:RecordEntry)=>void;onCancel:()=>void;onExtras:(record:RecordEntry)=>void;onDraft:(record:RecordEntry)=>void}){
 const layout=isNew&&record.kind==='cartao'?{id:'A0p4rB',title:'Cadastrar cartão',fields:{'Nome do cartão':'title',Banco:'Banco',Tipo:'Tipo','Últimos 4 dígitos':'Últimos quatro dígitos','Limite total':'Limite','Fechamento / vencimento':'Datas do cartão'}}:layouts[record.kind]
 const values=Object.fromEntries(Object.entries(layout.fields).map(([label,key])=>[label,key==='title'?record.title:record.fields[key]??'']))
 const bindings:Record<string,CanvasBinding>={
  'Mensagem original — título':{text:'Revise os dados do gasto'},'Mensagem original — detalhe':{text:record.title||'Novo registro'},'Falta escolher a conta — título':{text:'Registro em revisão'},'Falta escolher a conta — texto':{text:'Os dados serão salvos nos seus registros ao confirmar.'},'Correspondência — título':{text:record.title},'Correspondência — detalhe':{text:record.fields.Modalidade??''},'Correspondência — ação':{text:''},'Receber lembretes — check':{style:{display:record.fields.Lembretes==='Sim'?'':'none'}},'Receber lembretes — nome':{action:'Lembretes'},'Receber lembretes — explicação':{text:'Configure a entrega dos lembretes em Rotinas.'},'Deixar de acompanhar — botão':{style:{display:'none'}},'Deixar de acompanhar — texto':{style:{display:'none'}},
  'Descrição da tela':{text:record.kind==='memoria'?record.title:'Edite os dados do seu registro.'},
  'Próxima etapa do fluxo':{text:error?'':'Outros campos do registro',action:error?undefined:'Outros campos'},
  'Alteração em revisão — texto':{text:'As alterações serão aplicadas ao salvar.'},
  'Atualização manual — texto':{text:'O saldo será atualizado com o valor informado.'},
  'Mudança em revisão — texto':{text:'A informação será atualizada ao salvar.'},
  'Preferência do cartão':{text:record.fields.Padrão==='Sim'?'✓  Usar este cartão como padrão nos registros':'Usar este cartão como padrão nos registros',action:'Cartão padrão'},'Conta padrão':{text:''},
 }
 return <section className="pencil-record-editor" role="dialog" aria-modal="true" aria-label={layout.title}><CanvasScene id={layout.id} crop={false} values={values} fieldOptions={record.kind==='favorito'?{'Tipo de favorito':['Esportes','Artistas','Séries'].map(value=>({value,label:value}))}:record.kind==='memoria'&&agents.length?{'Compartilhar com':[...agents.map(agent=>({value:agent.id,label:agent.name})),...(record.id.startsWith('pref:')?[]:[{value:'Todos',label:'Toda a equipe'}])]}:undefined} bindings={bindings} decorate={root=>{
  if(['A0p4rB','NnWRc'].includes(layout.id)&&!error){const button=document.createElement('button');button.className='pencil-record-extras';button.dataset.label='Outros campos';button.textContent='Outros campos do registro';root.append(button)}
  for(const name of ['Repetir todos os anos','Sugerir mensagem e presente']){
   const mark=root.querySelector<HTMLElement>('[data-pencil-name="'+name+' — check"]'),selection=root.querySelector<HTMLElement>('[data-pencil-name="'+name+' — seleção"]')
   if(mark)mark.style.display=record.fields[name]==='Sim'?'':'none'
   if(selection){selection.dataset.label='toggle:'+name;selection.setAttribute('role','checkbox');selection.setAttribute('aria-label',name);selection.setAttribute('aria-checked',String(record.fields[name]==='Sim'));selection.tabIndex=0}
  }
 }} decorationKey={JSON.stringify(record.fields)} onAction={event=>{
  const next={...record,fields:{...record.fields}}
  for(const [label,key] of Object.entries(layout.fields)){if(event.fields[label]===undefined)continue;if(key==='title')next.title=event.fields[label];else next.fields[key]=event.fields[label]}
  if(event.label==='Cancelar'){onCancel();return}
  if(event.label==='Lembretes'){next.fields.Lembretes=record.fields.Lembretes==='Sim'?'Não':'Sim';onDraft(next);return}
  if(event.label==='Cartão padrão'){next.fields.Padrão=record.fields.Padrão==='Sim'?'Não':'Sim';onDraft(next);return}
  if(event.label==='Outros campos'){onExtras(next);return}
  if(event.label.startsWith('toggle:')){const key=event.label.slice(7);next.fields[key]=record.fields[key]==='Sim'?'Não':'Sim';onDraft(next);return}
  if(event.label.startsWith('Salvar')||event.label==='Confirmar registro'){if(next.kind==='cartao'&&next.fields['Datas do cartão']){const days=next.fields['Datas do cartão'].match(/\d+/g);if(days?.length===2){next.fields['Dia de fechamento']=days[0];next.fields['Dia de vencimento']=days[1]}}if(next.kind==='memoria'&&!next.title.trim())next.title=next.fields.Conteúdo?.slice(0,80)??'';onSave(next)}
 }}/>{error&&<p className="pencil-record-error" role="alert">{error}</p>}</section>
}
