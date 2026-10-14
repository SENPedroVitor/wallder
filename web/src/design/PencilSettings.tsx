import { useEffect, useRef, useState } from 'react'
import { PencilPhotoCrop } from './PencilPhotoCrop'
import { ProtectedCpf } from './ProtectedCpf'
import { CanvasScene, type CanvasBinding, type SceneAction } from './CanvasScene'
import { readSettings, type SettingsSection, type UserSettings } from './SettingsPage'
import type { Workspace } from './workspace'
import './pencil-settings.css'
import { runtimeJson, type RuntimeStatus } from '../runtime'

const screens = {profile:'iwTvk',account:'S1jVwg',appearance:'O2NMX',notifications:'jPh60',privacy:'WASyr',permissions:'JAr8U'} as const
export type PencilSettingsSection = keyof typeof screens
const navigation:Record<string,SettingsSection> = {Perfil:'profile',Conta:'account',Aparência:'appearance',Notificações:'notifications',Privacidade:'privacy'}
export function PencilSettings({section,data,onUpdate,onBack,onNavigate,onRoute,onConnections,onClearHistory,onBackup,runtimeStatus}:{section:PencilSettingsSection;data:Workspace;onUpdate:(fn:(data:Workspace)=>Workspace)=>void;onBack:()=>void;onNavigate:(section:SettingsSection)=>void;onRoute:(label:string)=>void;onConnections:()=>void;onClearHistory:()=>void;onBackup:()=>void;runtimeStatus:RuntimeStatus}) {
 const [crop,setCrop]=useState<string|null>(null)
 const [automation,setAutomation]=useState<'manual'|'automatic'>('manual')
 useEffect(()=>{if(section!=='permissions')return;let active=true;void runtimeJson<{mode:'manual'|'automatic'}>('automation').then(value=>{if(active)setAutomation(value.mode)}).catch(()=>{if(active)setNotice('Não foi possível consultar a autonomia.')});return()=>{active=false}},[section])
 const settings=readSettings(data),photoInput=useRef<HTMLInputElement>(null),[notice,setNotice]=useState('')
 const initials=(data.profile.name||'P').split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase()
 const [account,setAccount]=useState<{authenticated:boolean;email?:string;planType?:string}|null>(null)
 useEffect(()=>{if(section!=='account')return;let active=true;void runtimeJson<{authenticated:boolean;email?:string;planType?:string}>('account').then(value=>{if(active)setAccount(value)}).catch(()=>{if(active)setNotice('Não foi possível consultar a conta. Verifique o serviço local.')});return()=>{active=false}},[section])
 const bindings:Record<string,CanvasBinding>={
  'Pedro — nome na navegação':{text:data.profile.name||'Seu perfil'},'Pedro — iniciais na navegação':{text:initials},'Avatar atual — iniciais':{text:data.profile.avatar?'':initials},
  'Formatos da foto':{text:'JPG, PNG, WebP ou GIF · Até 5 MB'},
  'Contador da descrição':{text:(data.profile.bio?.length??0)+' / 160'},
  'Pedro — nome':{text:data.profile.name||'Seu perfil'},'Pedro — iniciais':{text:initials},
  'Senha — título':{text:'Autenticação do Codex'},'Senha — descrição':{text:account?.authenticated?'Autenticado com sua conta ChatGPT.':'Confira a autenticação no serviço local.'},'Alterar senha — texto':{text:'Serviço local',action:'Serviço local'},
  'Verificação em duas etapas — título':{text:'Segurança da conta ChatGPT'},'Verificação em duas etapas — descrição':{text:'As opções de segurança são gerenciadas na sua conta.'},'Verificação em duas etapas — trilho':{style:{display:'none'}},'Verificação em duas etapas — controle':{style:{display:'none'}},
  'Nome do dispositivo':{text:'Computador · Windows'},'Estado do dispositivo':{text:'Seu espaço local'},'Sessão ativa':{text:runtimeStatus.ready?'Ativo agora':'Indisponível'},'Encerrar outras sessões — texto':{text:'Exportar espaço',action:'Exportar'},'Excluir conta — aviso':{text:'Gerencie os dados do seu espaço local.'},'Excluir conta — ação':{text:'Backup',action:'Serviço local'},
  'Songbird — nome':{text:'Equipe'},'Songbird — função':{text:'Permissões do espaço local'},'Nota do formulário':{text:'Vale para todos os agentes e novas tarefas.'},'Google Drive — nome':{text:'Arquivos locais'},'Google Drive — descrição':{text:'Arquivos e entregas do espaço de trabalho'},'GitHub — nome':{text:'Autonomia da equipe'},'GitHub — descrição':{text:'Conexões e navegação de todos os agentes'},'GitHub — nível de acesso':{text:automation==='automatic'?'Automática':'Pedir aprovação'},
  'Claro — cartão de tema':{action:'Tema claro',style:{'outline-color':settings.appearance.theme==='light'?'#D8CE32':'light-dark(#E2E2E2,var(--w-line))'}},
  'Escuro — cartão de tema':{action:'Tema escuro',style:{'outline-color':settings.appearance.theme==='dark'?'#D8CE32':'light-dark(#E2E2E2,var(--w-line))'}},
  'Sistema — cartão de tema':{action:'Tema sistema',style:{'outline-color':settings.appearance.theme==='system'?'#D8CE32':'light-dark(#E2E2E2,var(--w-line))'}},
  'Tema claro selecionado':{style:{left:(settings.appearance.theme==='light'?378:settings.appearance.theme==='dark'?560:742)+'px'}},
  'Trocar avatar — câmera':{action:'Alterar foto'},'Amarelo Waddle — amostra':{action:'Destaque amarelo'},'Violeta — amostra':{action:'Destaque violeta'},'Verde — amostra':{action:'Destaque verde'},'Azul — amostra':{action:'Destaque azul'},'Areia — amostra':{action:'Destaque areia'},
 }
 function toggle(name:string,checked:boolean,action:string){bindings[name+' — trilho']={checked,action,style:{'background-color':checked?'var(--w-yellow)':'#DDDDDD'}};bindings[name+' — controle']={style:{left:checked?'748px':'734px','pointer-events':'none'}}}
 toggle('Reduzir animações',settings.appearance.reducedMotion,'Reduzir animações')
 toggle('Notificações ativadas',settings.notifications.enabled,'Notificações de atividade')
 toggle('Novas mensagens',settings.notifications.enabled,'Novas mensagens')
 toggle('Tarefas concluídas',settings.notifications.tasks??true,'Tarefas concluídas')
 toggle('Rotinas agendadas',settings.notifications.routines??true,'Rotinas agendadas')
 toggle('Pedidos de aprovação',settings.notifications.approvals??true,'Pedidos de aprovação')
 toggle('Sons de notificação',settings.notifications.sound,'Sons de notificação')
 toggle('Modo silencioso',settings.notifications.quiet??false,'Horário de silêncio')
 toggle('Confirmar ações externas',true,'Confirmar ações externas')
 bindings['Confirmar ações externas — trilho'].disabled=true
 bindings['Aprovações — trilho ativo']={checked:true,disabled:true,action:'Confirmar ações externas',style:{'background-color':'var(--w-yellow)'}}
 bindings['Aprovações — controle ativo']={style:{'pointer-events':'none'}}
 bindings['Notificações ativadas — controle'].style!.top='485px'
 for(const [name,top] of [['Novas mensagens',112],['Tarefas concluídas',175],['Rotinas agendadas',238],['Pedidos de aprovação',301],['Sons de notificação',364],['Modo silencioso',439],['Confirmar ações externas',112]] as const)bindings[name+' — controle'].style!.top=top+'px'
 bindings['Amarelo selecionado']={style:{left:({yellow:240,violet:284,green:328,blue:372,sand:416}[settings.appearance.accent??'yellow'])+'px'}}
 const values={'Autonomia da equipe':automation,Nome:data.profile.name,'Nome de usuário':data.profile.nickname,'Sobre você':data.profile.bio??'',Idioma:String(data.profile.language??'pt-BR'),'Fuso horário':String(data.profile.timezone??'America/Sao_Paulo'),'Densidade da interface':settings.appearance.density??'comfortable','Tamanho do texto':settings.appearance.textSize??'standard','Visibilidade do perfil':settings.privacy.shareProfile?'team':'private','Histórico das conversas':settings.privacy.saveHistory?'saved':'temporary','Arquivos locais':settings.permissions.files?'approval':'blocked','Operação do PC':settings.permissions.computer?'approval':'blocked','E-mail':account?.email??'',Início:settings.notifications.quietStart??'22:00',Fim:settings.notifications.quietEnd??'08:00'}
 function update<K extends keyof UserSettings>(group:K,patch:Partial<UserSettings[K]>) {onUpdate(previous=>({...previous,settings:{...(previous.settings as object??{}),...readSettings(previous),[group]:{...readSettings(previous)[group],...patch}}}));setNotice('Alteração salva.')}
 async function enableNotifications(){if(typeof Notification==='undefined'){setNotice('Notificações indisponíveis neste navegador.');return}const result=await Notification.requestPermission();update('notifications',{enabled:result==='granted'});if(result!=='granted')setNotice('Autorize as notificações nas permissões do navegador.')}
 async function upload(file?:File){if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>5*1024*1024){setNotice('Escolha uma imagem de até 5 MB.');return}try{const avatar=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file)});setCrop(avatar)}catch{setNotice('Não foi possível ler a foto.')}}
 function exportData(){const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),workspace:data},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='wendler-espaco.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function action(event:SceneAction){const label=event.label;
  if(navigation[label]){setNotice('');onNavigate(navigation[label]);return}if(label==='Conexões'){onConnections();return}if(/Voltar|Cancelar/.test(label)){onBack();return}if(['Conversas','Projetos','Rotinas'].includes(label)){onRoute(label);return}
  if(label==='Alterar foto'){photoInput.current?.click();return}if(label==='Remover'){onUpdate(previous=>({...previous,profile:{...previous.profile,avatar:''}}));return}
  if(label==='Tema claro'||label==='Tema escuro'||label==='Tema sistema'){update('appearance',{theme:label==='Tema claro'?'light':label==='Tema escuro'?'dark':'system'});return}
  if(label.startsWith('Destaque ')){const accent=({amarelo:'yellow',violeta:'violet',verde:'green',azul:'blue',areia:'sand'} as const)[label.slice(9) as 'amarelo'];if(accent)update('appearance',{accent});return}
  if(label==='Reduzir animações'){update('appearance',{reducedMotion:!settings.appearance.reducedMotion});return}
  if(label==='Novas mensagens'||label==='Notificações de atividade'){if(settings.notifications.enabled)update('notifications',{enabled:false});else void enableNotifications();return}
  const switches:Record<string,'tasks'|'routines'|'approvals'|'sound'|'quiet'>={'Tarefas concluídas':'tasks','Rotinas agendadas':'routines','Pedidos de aprovação':'approvals','Sons de notificação':'sound','Horário de silêncio':'quiet'}
  if(switches[label]){const key=switches[label];update('notifications',{[key]:!(settings.notifications[key]??['tasks','routines','approvals'].includes(key))});return}
  if(label==='Confirmar ações externas'){setNotice('Envios, publicações e compras continuam sujeitos à aprovação da ação.');return}
  if(label==='Exportar'){exportData();return}if(label==='Limpar'){onClearHistory();return}
  if(label==='Serviço local'){onBackup();return}
  if(label==='Salvar alterações'||label==='Salvar permissões'){
   if(section==='profile')onUpdate(previous=>({...previous,profile:{...previous.profile,name:event.fields.Nome??previous.profile.name,nickname:event.fields['Nome de usuário']??previous.profile.nickname,bio:event.fields['Sobre você']??previous.profile.bio,language:event.fields.Idioma??previous.profile.language,timezone:event.fields['Fuso horário']??previous.profile.timezone}}))
   if(section==='appearance')update('appearance',{density:(event.fields['Densidade da interface']??'comfortable') as 'comfortable'|'compact',textSize:(event.fields['Tamanho do texto']??'standard') as 'standard'|'large'})
   if(section==='privacy')update('privacy',{shareProfile:event.fields['Visibilidade do perfil']==='team',saveHistory:event.fields['Histórico das conversas']==='saved'})
   if(section==='permissions'){const mode=event.fields['Autonomia da equipe'];if(mode!=='manual'&&mode!=='automatic'){setNotice('Escolha um nível de autonomia.');return}void runtimeJson<{mode:'manual'|'automatic'}>('automation',{mode}).then(value=>{setAutomation(value.mode);update('permissions',{files:event.fields['Arquivos locais']==='approval',computer:event.fields['Operação do PC']==='approval'});setNotice('Permissões salvas para todos os agentes.')}).catch(error=>setNotice(error.message));return}
   if(section==='notifications')update('notifications',{quietStart:event.fields.Início??'22:00',quietEnd:event.fields.Fim??'08:00'})
   setNotice('Alterações salvas.')
  }
 }
 return <section className="pencil-settings waddle-scene-page" aria-label="Configurações">{section === 'profile' && <ProtectedCpf/>}<CanvasScene id={screens[section]} crop={false} values={values} bindings={bindings} onAction={action} fieldOptions={{'Autonomia da equipe':[{value:'manual',label:'Pedir aprovação'},{value:'automatic',label:'Automática'}],Idioma:[{value:'pt-BR',label:'Português (Brasil)'}],'Fuso horário':[{value:'America/Sao_Paulo',label:'São Paulo · UTC−3'}],'Densidade da interface':[{value:'comfortable',label:'Confortável'},{value:'compact',label:'Compacta'}],'Tamanho do texto':[{value:'standard',label:'Padrão'},{value:'large',label:'Grande'}],'Visibilidade do perfil':[{value:'team',label:'Você e sua equipe'},{value:'private',label:'Somente você'}],'Histórico das conversas':[{value:'saved',label:'Manter até eu excluir'},{value:'temporary',label:'Não salvar novas conversas'}],'Arquivos locais':[{value:'blocked',label:'Bloqueado'},{value:'approval',label:'Pedir aprovação ao alterar'}],'Operação do PC':[{value:'blocked',label:'Bloqueado'},{value:'approval',label:'Pedir aprovação ao agir'}]}} decorate={root=>{
  if(data.profile.avatar)for(const name of ['Foto de perfil — avatar atual','Pedro — avatar na navegação']){const node=root.querySelector<HTMLElement>('[data-pencil-name="'+name+'"]');if(node){node.style.backgroundImage='url("'+data.profile.avatar+'")';node.style.backgroundSize='cover';node.style.backgroundPosition='center'}}
  for(const [key,top] of [['Início',477],['Fim',477]] as const){const field=root.querySelector<HTMLElement>('[data-pencil-name="'+key+' — horário"]');if(field){field.dataset.pencilName=key+' — campo';field.style.top=top+'px'}}
  for(const [original,key] of [['GitHub','Autonomia da equipe'],['Google Drive','Arquivos locais'],['Operação do PC','Operação do PC']]){const field=root.querySelector<HTMLElement>('[data-pencil-name="'+original+' — seletor de acesso"]'),value=root.querySelector<HTMLElement>('[data-pencil-name="'+original+' — nível de acesso"]');if(field)field.dataset.pencilName=key+' — campo';if(value)value.dataset.pencilName=key+' — valor'}
  if(section==='account'){const field=root.querySelector<HTMLElement>('[data-pencil-name="E-mail — campo"]');if(field)field.dataset.pencilName='E-mail da conta';const value=root.querySelector<HTMLElement>('[data-pencil-name="E-mail — valor"]');if(value)value.textContent=account?.email??'E-mail da conta indisponível'}
 }} decorationKey={data.profile.avatar+'-'+automation}/><>{crop&&<PencilPhotoCrop source={crop} name={data.profile.name} onCancel={()=>setCrop(null)} onReplace={()=>photoInput.current?.click()} onUse={avatar=>{onUpdate(previous=>({...previous,profile:{...previous.profile,avatar}}));setCrop(null);setNotice('Foto salva.')}}/>}</><input ref={photoInput} className="pencil-photo-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Arquivo da foto do perfil" onChange={event=>{void upload(event.target.files?.[0]);event.target.value=''}}/>{notice&&<div className="pencil-settings-notice" role="status">{notice}</div>}</section>
}
