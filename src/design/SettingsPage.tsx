import { useEffect, useState } from 'react'
import { ArrowLeft, UserRound, Download, Moon, Sun, Monitor, Shield, Bell, Upload, Trash2 } from 'lucide-react'
import type { Workspace } from './workspace'
import { runtimeJson, type RuntimeStatus } from '../runtime'
import './settings.css'

export type SettingsSection = 'profile'|'account'|'appearance'|'privacy'|'notifications'|'permissions'
export type UserSettings = {
  appearance: { theme: 'light'|'dark'|'system'; reducedMotion: boolean; accent?:'yellow'|'violet'|'green'|'blue'|'sand'; density?:'comfortable'|'compact';textSize?:'standard'|'large' }
  privacy: { shareProfile: boolean; shareMemory: boolean; saveHistory: boolean }
  notifications: { enabled: boolean; sound: boolean;tasks?:boolean;routines?:boolean;approvals?:boolean;quiet?:boolean;quietStart?:string;quietEnd?:string }
  permissions: { files: boolean; computer: boolean }
}
export function readSettings(data: Workspace): UserSettings {
  const stored = (data.settings ?? {}) as Partial<UserSettings>
  return {
    appearance: { theme: data.theme, reducedMotion: false, ...stored.appearance },
    privacy: { shareProfile: true, shareMemory: true, saveHistory: true, ...stored.privacy },
    notifications: { enabled: false, sound: false, ...stored.notifications },
    permissions: { files: false, computer: false, ...stored.permissions },
  }
}
const titles: Record<SettingsSection, string> = {profile:'Perfil',account:'Conta',appearance:'Aparência',privacy:'Privacidade',notifications:'Notificações',permissions:'Permissões'}
function Switch({ label, description, checked, onChange }: {label:string;description:string;checked:boolean;onChange:(value:boolean)=>void}) {
  return <label className="settings-switch-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" role="switch" checked={checked} onChange={event=>onChange(event.target.checked)}/></label>
}
export default function SettingsPage({section,data,onUpdate,onBack,onBackup,onClearHistory,runtimeStatus}: {
  section:SettingsSection;data:Workspace;onUpdate:(mutator:(data:Workspace)=>Workspace)=>void;onBack:()=>void;
  onBackup?:()=>void;onClearHistory?:()=>void;runtimeStatus?:RuntimeStatus
}) {
  const settings = readSettings(data)
  const [notice,setNotice] = useState('')
  const [account,setAccount] = useState<{authenticated:boolean;type?:string;email?:string;planType?:string}|null>(null)
  const [accountError,setAccountError] = useState('')
  const [accountLoading,setAccountLoading] = useState(false)
  const [permission,setPermission] = useState<NotificationPermission|'unsupported'>(()=>typeof Notification==='undefined'?'unsupported':Notification.permission)
  useEffect(()=>setNotice(''),[section])
  useEffect(()=>{
    if(section!=='account')return
    let active=true
    setAccountLoading(true);setAccountError('')
    void runtimeJson<{authenticated:boolean;type?:string;email?:string;planType?:string}>('account').then(value=>{if(active)setAccount(value)}).catch(error=>{if(active)setAccountError(error instanceof Error?error.message:'Não foi possível consultar a conta do Codex.')}).finally(()=>{if(active)setAccountLoading(false)})
    return ()=>{active=false}
  },[section,runtimeStatus?.authenticated])
  function update<K extends keyof UserSettings>(group:K, patch:Partial<UserSettings[K]>) {
    onUpdate(previous=>{const next=readSettings(previous); return {...previous,settings:{...(previous.settings as object ?? {}),...next,[group]:{...next[group],...patch}}} })
    setNotice('Alteração salva neste espaço.')
  }
  function profile(patch:Partial<Workspace['profile']>) {onUpdate(previous=>({...previous,profile:{...previous.profile,...patch}}));setNotice('Perfil salvo neste espaço.')}
  async function upload(file?:File) {
    if(!file)return
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setNotice('Escolha uma imagem PNG, JPEG, WebP ou GIF.');return}
    if(file.size>2*1024*1024){setNotice('A imagem deve ter até 2 MB.');return}
    try {const value=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file)});profile({avatar:value})}catch{setNotice('Não foi possível ler a imagem.')}
  }
  function theme(value:UserSettings['appearance']['theme']) {
    const resolved=value==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):value
    onUpdate(previous=>({...previous,theme:resolved,settings:{...(previous.settings as object ?? {}),...readSettings(previous),appearance:{...readSettings(previous).appearance,theme:value}}}))
    document.documentElement.dataset.theme=resolved
    setNotice('Aparência salva.')
  }
  function exportWorkspace() {
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),workspace:data},null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='wendler-espaco.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Exportação do espaço baixada.')
  }
  async function notifications() {
    if(typeof Notification==='undefined'){setNotice('Este navegador não oferece notificações.');return}
    try {const granted=await Notification.requestPermission();setPermission(granted);update('notifications',{enabled:granted==='granted'});setNotice(granted==='granted'?'Notificações autorizadas.':'Notificações não autorizadas. Ajuste a permissão no navegador.')}catch{setNotice('Não foi possível solicitar a permissão.')}
  }
  return <main className="settings-page"><header className="settings-header"><button onClick={onBack}><ArrowLeft size={16}/>Voltar às conversas</button><h1>{titles[section]}</h1><p>Seu espaço, do seu jeito. As alterações são salvas automaticamente.</p></header><div className="settings-body">
    {section==='profile'&&<><section className="settings-avatar-row"><div className="settings-avatar">{data.profile.avatar?<img src={data.profile.avatar} alt="Sua foto de perfil"/>:<UserRound size={30}/>}</div><div><strong>Foto do perfil</strong><p>PNG, JPEG, WebP ou GIF. Até 2 MB.</p><div className="settings-actions"><label className="settings-button"><Upload size={14}/>Enviar foto<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event=>{void upload(event.target.files?.[0]);event.target.value=''}}/></label>{data.profile.avatar&&<button onClick={()=>profile({avatar:''})}><Trash2 size={14}/>Remover</button>}</div></div></section><label className="settings-field">Nome<input maxLength={100} autoComplete="name" value={data.profile.name} onChange={event=>profile({name:event.target.value})}/></label><label className="settings-field">Como quer ser chamado<input maxLength={80} value={data.profile.nickname} onChange={event=>profile({nickname:event.target.value})}/></label><label className="settings-field">Sobre você<textarea rows={4} maxLength={2000} value={data.profile.bio??''} onChange={event=>profile({bio:event.target.value})}/><small>Este texto só entra nas conversas quando o compartilhamento do perfil está ativado.</small></label></>}
    {section==='account'&&<><section className="settings-card"><h2>Espaço local</h2><p>Perfil, conversas e preferências são salvos no serviço local e compartilhados pelas janelas deste espaço. O Codex usa a autenticação configurada nesse serviço.</p><dl><dt>Nome</dt><dd>{data.profile.name||'Ainda não informado'}</dd><dt>Conversas</dt><dd>{data.chats.length}</dd><dt>Codex</dt><dd>{accountLoading?'Consultando…':account?account.authenticated?'Autenticado':'Sem autenticação':runtimeStatus?.authenticated?'Autenticado no serviço':'Status não disponível'}</dd>{account?.email&&<><dt>E-mail</dt><dd>{account.email}</dd></>}{account?.type&&<><dt>Autenticação</dt><dd>{account.type}</dd></>}{account?.planType&&<><dt>Plano</dt><dd>{account.planType}</dd></>}<dt>Serviço</dt><dd>{runtimeStatus?.ready?'Disponível':runtimeStatus?.error||'Não disponível'}</dd>{runtimeStatus?.model&&<><dt>Modelo</dt><dd>{runtimeStatus.model}</dd></>}{runtimeStatus?.workspace&&<><dt>Diretório</dt><dd>{runtimeStatus.workspace}</dd></>}</dl>{accountError&&<p role="alert">{accountError}</p>}</section><section className="settings-card"><h2>Seus dados</h2><p>Exporte o perfil, preferências e conversas em JSON. O backup do serviço inclui os dados mantidos pelo motor local.</p><div className="settings-actions"><button className="settings-primary" onClick={exportWorkspace}><Download size={15}/>Exportar espaço</button>{onBackup&&<button onClick={onBackup}>Abrir backup do serviço</button>}</div></section></>}
    {section==='appearance'&&<><h2>Tema</h2><div className="settings-themes">{([{value:'light',label:'Claro',Icon:Sun},{value:'dark',label:'Escuro',Icon:Moon},{value:'system',label:'Sistema',Icon:Monitor}] as const).map(item=><button key={item.value} aria-pressed={settings.appearance.theme===item.value} onClick={()=>theme(item.value)}><span className={`settings-theme-preview ${item.value}`}><i/><b/><b/></span><span><item.Icon size={15}/>{item.label}</span></button>)}</div><p className="settings-hint">O tema Sistema acompanha a preferência de aparência do seu dispositivo.</p><Switch label="Reduzir movimento" description="Simplificar animações e transições da interface." checked={settings.appearance.reducedMotion} onChange={value=>update('appearance',{reducedMotion:value})}/></>}
    {section==='privacy'&&<><Switch label="Compartilhar perfil nas conversas" description="Incluir seu nome, apelido e descrição no contexto enviado ao Codex." checked={settings.privacy.shareProfile} onChange={value=>update('privacy',{shareProfile:value})}/><Switch label="Usar memória dos agentes" description="Incluir as notas de memória salvas de cada agente nos próximos pedidos." checked={settings.privacy.shareMemory} onChange={value=>update('privacy',{shareMemory:value})}/><Switch label="Salvar histórico de conversas" description="Manter novas mensagens após fechar o aplicativo. O histórico já existente é preservado até você apagá-lo." checked={settings.privacy.saveHistory} onChange={value=>update('privacy',{saveHistory:value})}/><section className="settings-card"><h2>Histórico</h2><p>Apagar remove as conversas do espaço e do histórico do serviço local. As sessões correspondentes são arquivadas no Codex, que mantém seu próprio histórico. Exporte seus dados antes de continuar.</p><div className="settings-actions"><button onClick={exportWorkspace}><Download size={14}/>Exportar espaço</button>{onClearHistory&&<button className="settings-danger" onClick={onClearHistory}><Trash2 size={14}/>Apagar histórico…</button>}</div></section></>}
    {section==='notifications'&&<><section className="settings-card"><h2><Bell size={17}/>Notificações do navegador</h2><p>Permissão atual: {permission==='granted'?'autorizada':permission==='denied'?'bloqueada':permission==='unsupported'?'indisponível':'ainda não solicitada'}.</p><button disabled={permission==='unsupported'||permission==='denied'} onClick={()=>void notifications()}>Solicitar permissão</button>{permission==='denied'&&<p>Para autorizar, abra as permissões deste site no navegador.</p>}</section><Switch label="Avisar quando uma resposta terminar" description="Mostrar uma notificação quando você estiver fora da janela." checked={settings.notifications.enabled} onChange={value=>{if(value&&permission!=='granted')void notifications();else update('notifications',{enabled:value})}}/><Switch label="Som de notificação" description="Reproduzir um aviso breve junto da notificação de resposta." checked={settings.notifications.sound} onChange={value=>update('notifications',{sound:value})}/></>}
    {section==='permissions'&&<><section className="settings-card"><h2><Shield size={17}/>Preferências de ferramentas</h2><p>Escolha os recursos locais do Wendler disponíveis nos próximos pedidos. Ferramentas de serviços conectados seguem as permissões do próprio serviço.</p></section><Switch label="Arquivos do espaço" description="Disponibilizar os comandos locais de leitura e alteração de arquivos do Wendler." checked={settings.permissions.files} onChange={value=>update('permissions',{files:value})}/><Switch label="Computador" description="Disponibilizar os controles locais de captura de tela, teclado e mouse do Wendler, quando disponíveis." checked={settings.permissions.computer} onChange={value=>update('permissions',{computer:value})}/></>}
  </div><footer className="settings-footer"><span role="status" aria-live="polite">{notice||'Suas preferências ficam salvas neste espaço local.'}</span></footer></main>
}
